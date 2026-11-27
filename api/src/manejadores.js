/**
 * Manejadores HTTP de la API. Reciben el repositorio como parámetro para
 * poder probarse sin conectarse a la base de datos.
 */

const { validarCita, obtenerFechaHoraColombia, esFechaValida } = require('./validacion');
const { HorarioOcupadoError } = require('./errores');

const ENCABEZADOS_JSON = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

/**
 * Construye una respuesta HTTP en formato JSON.
 * @param {number} estado Código HTTP.
 * @param {object} cuerpo Contenido de la respuesta.
 * @returns {{status: number, headers: object, body: object}}
 */
function responder(estado, cuerpo) {
  return { status: estado, headers: ENCABEZADOS_JSON, body: cuerpo };
}

/**
 * Deja solo los datos de una cita que son seguros de devolver.
 * @param {object} cita
 * @returns {object}
 */
function resumirCita(cita) {
  return {
    id: cita.id,
    fecha: cita.fecha,
    hora: cita.hora,
    nombreMascota: cita.nombreMascota,
    especie: cita.especie,
    estado: cita.estado
  };
}

/**
 * Crea el manejador del endpoint de citas (GET y POST).
 * @param {{crearCita: Function, listarCitas: Function}} repositorio
 * @param {() => Date} [obtenerAhora] Reloj inyectable para las pruebas.
 * @returns {(context: object, req: object) => Promise<void>}
 */
function crearManejadorCitas(repositorio, obtenerAhora = () => new Date()) {
  async function registrarCita(req) {
    const resultado = validarCita(req.body, obtenerAhora());
    if (!resultado.valida) {
      return responder(400, { error: 'Los datos de la cita no son válidos.', detalles: resultado.errores });
    }
    try {
      const creada = await repositorio.crearCita(resultado.cita);
      return responder(201, resumirCita(creada));
    } catch (error) {
      if (error instanceof HorarioOcupadoError) {
        return responder(409, { error: error.message });
      }
      throw error;
    }
  }

  async function consultarCitas(req) {
    const fecha = req.query ? req.query.fecha : undefined;
    if (fecha !== undefined && !esFechaValida(fecha)) {
      return responder(400, { error: 'El parámetro fecha debe tener el formato AAAA-MM-DD.' });
    }
    const filtro = fecha ? { fecha } : { desde: obtenerFechaHoraColombia(obtenerAhora()).fecha };
    const citas = await repositorio.listarCitas(filtro);
    return responder(200, { citas });
  }

  return async function manejarCitas(context, req) {
    try {
      if (req.method === 'POST') {
        context.res = await registrarCita(req);
      } else if (req.method === 'GET') {
        context.res = await consultarCitas(req);
      } else {
        context.res = responder(405, { error: 'Método no permitido.' });
      }
    } catch (error) {
      context.log.error('Error al procesar la solicitud de citas', error);
      context.res = responder(500, { error: 'Error interno del servidor.' });
    }
  };
}

/**
 * Crea el manejador del endpoint de salud.
 * @param {{verificarConexion: Function}} repositorio
 * @returns {(context: object) => Promise<void>}
 */
function crearManejadorSalud(repositorio) {
  return async function manejarSalud(context) {
    try {
      await repositorio.verificarConexion();
      context.res = responder(200, { estado: 'ok', baseDatos: 'ok' });
    } catch (error) {
      context.log.error('La base de datos no responde', error);
      context.res = responder(503, { estado: 'error', baseDatos: 'error' });
    }
  };
}

module.exports = { crearManejadorCitas, crearManejadorSalud };
