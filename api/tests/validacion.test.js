const test = require('node:test');
const assert = require('node:assert/strict');
const { validarCita, obtenerFechaHoraColombia, esFechaValida } = require('../src/validacion');

const AHORA = new Date('2026-11-25T15:00:00Z');

function citaBase(cambios = {}) {
  return {
    nombreCliente: 'Laura Martínez',
    telefono: '300 123 4567',
    correo: 'laura@example.com',
    nombreMascota: 'Toby',
    especie: 'perro',
    fecha: '2026-11-26',
    hora: '09:30',
    motivo: 'Vacunación anual',
    aceptaTratamientoDatos: true,
    ...cambios
  };
}

test('acepta una cita completa y normaliza el teléfono', () => {
  const resultado = validarCita(citaBase(), AHORA);
  assert.equal(resultado.valida, true);
  assert.deepEqual(resultado.errores, []);
  assert.equal(resultado.cita.telefono, '3001234567');
});

test('convierte el instante a la hora de Colombia', () => {
  assert.deepEqual(obtenerFechaHoraColombia(AHORA), { fecha: '2026-11-25', hora: '10:00' });
});

test('rechaza un cuerpo que no es un objeto', () => {
  assert.equal(validarCita(null, AHORA).valida, false);
  assert.equal(validarCita('texto', AHORA).valida, false);
  assert.equal(validarCita([], AHORA).valida, false);
});

test('rechaza un correo inválido', () => {
  const resultado = validarCita(citaBase({ correo: 'laura-sin-arroba' }), AHORA);
  assert.equal(resultado.valida, false);
  assert.ok(resultado.errores.some((mensaje) => mensaje.includes('correo')));
});

test('rechaza una especie no permitida', () => {
  const resultado = validarCita(citaBase({ especie: 'dragón' }), AHORA);
  assert.equal(resultado.valida, false);
});

test('rechaza una fecha pasada', () => {
  const resultado = validarCita(citaBase({ fecha: '2026-11-24' }), AHORA);
  assert.equal(resultado.valida, false);
  assert.ok(resultado.errores.some((mensaje) => mensaje.includes('futuras')));
});

test('rechaza una hora que ya pasó el mismo día', () => {
  const resultado = validarCita(citaBase({ fecha: '2026-11-25', hora: '09:30' }), AHORA);
  assert.equal(resultado.valida, false);
});

test('acepta una hora posterior a la actual el mismo día', () => {
  const resultado = validarCita(citaBase({ fecha: '2026-11-25', hora: '10:30' }), AHORA);
  assert.equal(resultado.valida, true);
});

test('rechaza los domingos', () => {
  const resultado = validarCita(citaBase({ fecha: '2026-11-29' }), AHORA);
  assert.equal(resultado.valida, false);
  assert.ok(resultado.errores.some((mensaje) => mensaje.includes('domingos')));
});

test('rechaza horas fuera del horario o que no son de 30 minutos', () => {
  assert.equal(validarCita(citaBase({ hora: '06:30' }), AHORA).valida, false);
  assert.equal(validarCita(citaBase({ hora: '19:00' }), AHORA).valida, false);
  assert.equal(validarCita(citaBase({ hora: '09:15' }), AHORA).valida, false);
  assert.equal(validarCita(citaBase({ hora: '18:30' }), AHORA).valida, true);
});

test('exige la autorización de tratamiento de datos', () => {
  const resultado = validarCita(citaBase({ aceptaTratamientoDatos: false }), AHORA);
  assert.equal(resultado.valida, false);
  assert.ok(resultado.errores.some((mensaje) => mensaje.includes('autorizar')));
});

test('reconoce fechas reales y rechaza fechas inexistentes', () => {
  assert.equal(esFechaValida('2026-11-26'), true);
  assert.equal(esFechaValida('2026-02-30'), false);
  assert.equal(esFechaValida('26-11-2026'), false);
  assert.equal(esFechaValida(undefined), false);
});
