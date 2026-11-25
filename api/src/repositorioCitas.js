/**
 * Acceso a la base de datos Cosmos DB para las citas.
 *
 * La configuración llega por variables de entorno que define la
 * infraestructura: COSMOS_CONNECTION_STRING, COSMOS_DATABASE y COSMOS_CONTAINER.
 */

const { CosmosClient } = require('@azure/cosmos');
const { HorarioOcupadoError } = require('./errores');

const LIMITE_CITAS_LISTADAS = 200;
const CODIGO_CONFLICTO = 409;

let contenedorEnCache = null;

/**
 * Devuelve el contenedor de citas, creando el cliente la primera vez.
 * @returns {import('@azure/cosmos').Container}
 */
function obtenerContenedor() {
  if (contenedorEnCache === null) {
    const cliente = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
    contenedorEnCache = cliente
      .database(process.env.COSMOS_DATABASE)
      .container(process.env.COSMOS_CONTAINER);
  }
  return contenedorEnCache;
}

/**
 * Guarda una cita. El identificador se forma con la fecha y la hora, así
 * que Cosmos DB rechaza una segunda cita en la misma franja.
 * @param {object} cita Cita ya validada.
 * @returns {Promise<object>} Documento guardado.
 * @throws {HorarioOcupadoError} Si la franja ya está tomada.
 */
async function crearCita(cita) {
  const documento = {
    id: `${cita.fecha}_${cita.hora.replace(':', '')}`,
    ...cita,
    estado: 'programada',
    creadaEn: new Date().toISOString()
  };
  try {
    await obtenerContenedor().items.create(documento);
  } catch (error) {
    if (error.code === CODIGO_CONFLICTO) {
      throw new HorarioOcupadoError();
    }
    throw error;
  }
  return documento;
}

/**
 * Lista citas sin datos personales del cliente.
 * @param {{fecha?: string, desde?: string}} filtro Una fecha exacta o una fecha de inicio.
 * @returns {Promise<object[]>} Citas ordenadas por fecha y hora.
 */
async function listarCitas(filtro) {
  const campos = 'c.id, c.fecha, c.hora, c.nombreMascota, c.especie, c.estado';
  const consulta = filtro.fecha
    ? {
        query: `SELECT ${campos} FROM c WHERE c.fecha = @fecha`,
        parameters: [{ name: '@fecha', value: filtro.fecha }]
      }
    : {
        query: `SELECT TOP ${LIMITE_CITAS_LISTADAS} ${campos} FROM c WHERE c.fecha >= @desde ORDER BY c.fecha`,
        parameters: [{ name: '@desde', value: filtro.desde }]
      };
  const { resources } = await obtenerContenedor().items.query(consulta).fetchAll();
  return resources.sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`));
}

/**
 * Comprueba que la base de datos responde.
 * @returns {Promise<void>}
 */
async function verificarConexion() {
  await obtenerContenedor().read();
}

module.exports = { crearCita, listarCitas, verificarConexion };
