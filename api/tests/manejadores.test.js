const test = require('node:test');
const assert = require('node:assert/strict');
const { crearManejadorCitas, crearManejadorSalud } = require('../src/manejadores');
const { HorarioOcupadoError } = require('../src/errores');

const AHORA = new Date('2026-11-25T15:00:00Z');

function crearContexto() {
  return { res: null, log: { error() {} } };
}

function citaValida() {
  return {
    nombreCliente: 'Laura Martínez',
    telefono: '3001234567',
    correo: 'laura@example.com',
    nombreMascota: 'Toby',
    especie: 'perro',
    fecha: '2026-11-26',
    hora: '09:30',
    motivo: '',
    aceptaTratamientoDatos: true
  };
}

function crearRepositorioSimulado() {
  const llamadas = { crear: 0, listar: [] };
  return {
    llamadas,
    async crearCita(cita) {
      llamadas.crear += 1;
      return { id: '2026-11-26_0930', ...cita, estado: 'programada' };
    },
    async listarCitas(filtro) {
      llamadas.listar.push(filtro);
      return [{ id: '2026-11-26_0930', fecha: '2026-11-26', hora: '09:30', nombreMascota: 'Toby', especie: 'perro', estado: 'programada' }];
    },
    async verificarConexion() {}
  };
}

test('POST con datos válidos responde 201 sin datos personales', async () => {
  const repositorio = crearRepositorioSimulado();
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'POST', body: citaValida() });

  assert.equal(contexto.res.status, 201);
  assert.equal(contexto.res.body.nombreMascota, 'Toby');
  assert.equal(contexto.res.body.correo, undefined);
  assert.equal(contexto.res.body.telefono, undefined);
  assert.equal(repositorio.llamadas.crear, 1);
});

test('POST con datos inválidos responde 400 y no guarda nada', async () => {
  const repositorio = crearRepositorioSimulado();
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'POST', body: { ...citaValida(), correo: 'mal' } });

  assert.equal(contexto.res.status, 400);
  assert.ok(contexto.res.body.detalles.length > 0);
  assert.equal(repositorio.llamadas.crear, 0);
});

test('POST en un horario ocupado responde 409', async () => {
  const repositorio = crearRepositorioSimulado();
  repositorio.crearCita = async () => {
    throw new HorarioOcupadoError();
  };
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'POST', body: citaValida() });

  assert.equal(contexto.res.status, 409);
});

test('un error inesperado responde 500 sin exponer detalles', async () => {
  const repositorio = crearRepositorioSimulado();
  repositorio.crearCita = async () => {
    throw new Error('fallo interno con datos sensibles');
  };
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'POST', body: citaValida() });

  assert.equal(contexto.res.status, 500);
  assert.equal(JSON.stringify(contexto.res.body).includes('sensibles'), false);
});

test('GET sin parámetros lista las citas desde hoy en hora de Colombia', async () => {
  const repositorio = crearRepositorioSimulado();
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'GET', query: {} });

  assert.equal(contexto.res.status, 200);
  assert.equal(contexto.res.body.citas.length, 1);
  assert.deepEqual(repositorio.llamadas.listar[0], { desde: '2026-11-25' });
});

test('GET con una fecha inválida responde 400', async () => {
  const repositorio = crearRepositorioSimulado();
  const manejar = crearManejadorCitas(repositorio, () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'GET', query: { fecha: 'hoy' } });

  assert.equal(contexto.res.status, 400);
  assert.equal(repositorio.llamadas.listar.length, 0);
});

test('un método no permitido responde 405', async () => {
  const manejar = crearManejadorCitas(crearRepositorioSimulado(), () => AHORA);
  const contexto = crearContexto();

  await manejar(contexto, { method: 'DELETE' });

  assert.equal(contexto.res.status, 405);
});

test('salud responde 200 cuando la base de datos responde', async () => {
  const manejar = crearManejadorSalud(crearRepositorioSimulado());
  const contexto = crearContexto();

  await manejar(contexto);

  assert.equal(contexto.res.status, 200);
  assert.deepEqual(contexto.res.body, { estado: 'ok', baseDatos: 'ok' });
});

test('salud responde 503 cuando la base de datos falla', async () => {
  const repositorio = crearRepositorioSimulado();
  repositorio.verificarConexion = async () => {
    throw new Error('sin conexión');
  };
  const manejar = crearManejadorSalud(repositorio);
  const contexto = crearContexto();

  await manejar(contexto);

  assert.equal(contexto.res.status, 503);
});
