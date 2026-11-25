/**
 * Reglas de validación de las citas de la veterinaria Patitas.
 *
 * Supuestos de negocio: se atiende de lunes a sábado, con citas cada
 * 30 minutos entre las 07:00 y las 18:30, en hora de Colombia.
 */

const ESPECIES_PERMITIDAS = ['perro', 'gato', 'otro'];
const ZONA_HORARIA = 'America/Bogota';
const PRIMERA_HORA_CITA = 7;
const ULTIMA_HORA_CITA = 18;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_HORA = /^([01]\d|2[0-3]):(00|30)$/;
const PATRON_TELEFONO = /^\+?\d{7,15}$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Limpia un valor recibido: devuelve el texto sin espacios en los extremos
 * o una cadena vacía si el valor no es texto.
 * @param {unknown} valor
 * @returns {string}
 */
function limpiarTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Obtiene la fecha (AAAA-MM-DD) y la hora (HH:MM) en Colombia para un instante.
 * @param {Date} instante
 * @returns {{fecha: string, hora: string}}
 */
function obtenerFechaHoraColombia(instante) {
  const formateador = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const valores = {};
  for (const parte of formateador.formatToParts(instante)) {
    valores[parte.type] = parte.value;
  }
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    hora: `${valores.hour}:${valores.minute}`
  };
}

/**
 * Indica si un texto es una fecha real con formato AAAA-MM-DD.
 * @param {string} fecha
 * @returns {boolean}
 */
function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !PATRON_FECHA.test(fecha)) {
    return false;
  }
  const convertida = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(convertida.getTime()) && convertida.toISOString().slice(0, 10) === fecha;
}

/**
 * Indica si la fecha cae en domingo.
 * @param {string} fecha Fecha válida con formato AAAA-MM-DD.
 * @returns {boolean}
 */
function esDomingo(fecha) {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay() === 0;
}

/**
 * Indica si la hora corresponde a una franja de atención válida.
 * @param {string} hora Texto con formato HH:MM.
 * @returns {boolean}
 */
function esHoraDeAtencion(hora) {
  if (!PATRON_HORA.test(hora)) {
    return false;
  }
  const horaEntera = Number(hora.slice(0, 2));
  return horaEntera >= PRIMERA_HORA_CITA && horaEntera <= ULTIMA_HORA_CITA;
}

/**
 * Valida y normaliza los datos de una cita.
 * @param {unknown} entrada Cuerpo recibido en la solicitud.
 * @param {Date} [ahora] Instante actual, inyectable para las pruebas.
 * @returns {{valida: boolean, errores: string[], cita: object|null}}
 */
function validarCita(entrada, ahora = new Date()) {
  const errores = [];

  if (entrada === null || typeof entrada !== 'object' || Array.isArray(entrada)) {
    return { valida: false, errores: ['El cuerpo de la solicitud debe ser un objeto JSON.'], cita: null };
  }

  const nombreCliente = limpiarTexto(entrada.nombreCliente);
  const telefono = limpiarTexto(entrada.telefono).replace(/[\s-]/g, '');
  const correo = limpiarTexto(entrada.correo);
  const nombreMascota = limpiarTexto(entrada.nombreMascota);
  const especie = limpiarTexto(entrada.especie).toLowerCase();
  const fecha = limpiarTexto(entrada.fecha);
  const hora = limpiarTexto(entrada.hora);
  const motivo = limpiarTexto(entrada.motivo);

  if (nombreCliente.length < 2 || nombreCliente.length > 80) {
    errores.push('El nombre del cliente debe tener entre 2 y 80 caracteres.');
  }
  if (!PATRON_TELEFONO.test(telefono)) {
    errores.push('El teléfono debe tener entre 7 y 15 dígitos.');
  }
  if (!PATRON_CORREO.test(correo) || correo.length > 120) {
    errores.push('El correo electrónico no es válido.');
  }
  if (nombreMascota.length < 2 || nombreMascota.length > 60) {
    errores.push('El nombre de la mascota debe tener entre 2 y 60 caracteres.');
  }
  if (!ESPECIES_PERMITIDAS.includes(especie)) {
    errores.push('La especie debe ser perro, gato u otro.');
  }
  if (motivo.length > 200) {
    errores.push('El motivo no puede superar los 200 caracteres.');
  }
  if (entrada.aceptaTratamientoDatos !== true) {
    errores.push('Debe autorizar el tratamiento de sus datos personales.');
  }

  const fechaCorrecta = esFechaValida(fecha);
  const horaCorrecta = esHoraDeAtencion(hora);

  if (!fechaCorrecta) {
    errores.push('La fecha debe tener el formato AAAA-MM-DD y existir en el calendario.');
  } else if (esDomingo(fecha)) {
    errores.push('No se atiende los domingos.');
  }

  if (!horaCorrecta) {
    errores.push('La hora debe ser una franja de 30 minutos entre las 07:00 y las 18:30.');
  }

  if (fechaCorrecta && horaCorrecta) {
    const actual = obtenerFechaHoraColombia(ahora);
    const esPasada = fecha < actual.fecha || (fecha === actual.fecha && hora <= actual.hora);
    if (esPasada) {
      errores.push('La cita debe ser en una fecha y hora futuras.');
    }
  }

  if (errores.length > 0) {
    return { valida: false, errores, cita: null };
  }

  return {
    valida: true,
    errores: [],
    cita: {
      nombreCliente,
      telefono,
      correo,
      nombreMascota,
      especie,
      fecha,
      hora,
      motivo,
      aceptaTratamientoDatos: true
    }
  };
}

module.exports = {
  validarCita,
  obtenerFechaHoraColombia,
  esFechaValida
};
