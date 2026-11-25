const RUTA_CITAS = '/api/citas';
const ZONA_HORARIA = 'America/Bogota';
const PRIMERA_HORA = 7;
const ULTIMA_HORA = 18;

const formulario = document.getElementById('formulario-cita');
const botonAgendar = document.getElementById('boton-agendar');
const mensaje = document.getElementById('mensaje');
const agenda = document.getElementById('agenda');
const campoFecha = document.getElementById('fecha');
const campoHora = document.getElementById('hora');

/**
 * Devuelve la fecha de hoy en Colombia con formato AAAA-MM-DD.
 * @returns {string}
 */
function obtenerHoyEnColombia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date());
}

/**
 * Llena la lista de horas con franjas de 30 minutos.
 */
function cargarHoras() {
  for (let hora = PRIMERA_HORA; hora <= ULTIMA_HORA; hora += 1) {
    for (const minutos of ['00', '30']) {
      const valor = `${String(hora).padStart(2, '0')}:${minutos}`;
      const opcion = document.createElement('option');
      opcion.value = valor;
      opcion.textContent = valor;
      campoHora.appendChild(opcion);
    }
  }
}

/**
 * Muestra un mensaje de estado debajo del formulario.
 * @param {string} texto
 * @param {'exito'|'error'} tipo
 * @param {string[]} [detalles]
 */
function mostrarMensaje(texto, tipo, detalles = []) {
  mensaje.className = `mensaje ${tipo}`;
  mensaje.textContent = texto;
  if (detalles.length > 0) {
    const lista = document.createElement('ul');
    for (const detalle of detalles) {
      const elemento = document.createElement('li');
      elemento.textContent = detalle;
      lista.appendChild(elemento);
    }
    mensaje.appendChild(lista);
  }
}

/**
 * Convierte una fecha AAAA-MM-DD en un texto legible en español.
 * @param {string} fecha
 * @returns {string}
 */
function formatearFecha(fecha) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

/**
 * Dibuja la agenda agrupada por día.
 * @param {Array<{fecha: string, hora: string, nombreMascota: string, especie: string}>} citas
 */
function dibujarAgenda(citas) {
  agenda.replaceChildren();

  if (citas.length === 0) {
    const vacio = document.createElement('p');
    vacio.className = 'vacio';
    vacio.textContent = 'Aún no hay citas programadas. Agenda la primera.';
    agenda.appendChild(vacio);
    return;
  }

  const citasPorFecha = new Map();
  for (const cita of citas) {
    if (!citasPorFecha.has(cita.fecha)) {
      citasPorFecha.set(cita.fecha, []);
    }
    citasPorFecha.get(cita.fecha).push(cita);
  }

  for (const [fecha, citasDelDia] of citasPorFecha) {
    const dia = document.createElement('div');
    dia.className = 'dia';

    const titulo = document.createElement('h3');
    titulo.textContent = formatearFecha(fecha);
    dia.appendChild(titulo);

    const lista = document.createElement('ul');
    for (const cita of citasDelDia) {
      const elemento = document.createElement('li');

      const hora = document.createElement('span');
      hora.className = 'hora';
      hora.textContent = cita.hora;

      const descripcion = document.createElement('span');
      descripcion.textContent = cita.nombreMascota;

      const especie = document.createElement('span');
      especie.className = 'detalle-especie';
      especie.textContent = ` · ${cita.especie}`;
      descripcion.appendChild(especie);

      elemento.append(hora, descripcion);
      lista.appendChild(elemento);
    }
    dia.appendChild(lista);
    agenda.appendChild(dia);
  }
}

/**
 * Consulta las próximas citas a la API y las muestra.
 */
async function cargarAgenda() {
  try {
    const respuesta = await fetch(RUTA_CITAS);
    if (!respuesta.ok) {
      throw new Error(`Respuesta ${respuesta.status}`);
    }
    const datos = await respuesta.json();
    dibujarAgenda(datos.citas);
  } catch (error) {
    agenda.replaceChildren();
    const aviso = document.createElement('p');
    aviso.className = 'vacio';
    aviso.textContent = 'No pudimos cargar la agenda. Actualiza la página para intentarlo de nuevo.';
    agenda.appendChild(aviso);
  }
}

/**
 * Lee los datos del formulario con el formato que espera la API.
 * @returns {object}
 */
function leerFormulario() {
  const datos = new FormData(formulario);
  return {
    nombreCliente: datos.get('nombreCliente'),
    telefono: datos.get('telefono'),
    correo: datos.get('correo'),
    nombreMascota: datos.get('nombreMascota'),
    especie: datos.get('especie'),
    fecha: datos.get('fecha'),
    hora: datos.get('hora'),
    motivo: datos.get('motivo'),
    aceptaTratamientoDatos: datos.get('aceptaTratamientoDatos') === 'on'
  };
}

/**
 * Envía la cita a la API y muestra el resultado.
 * @param {SubmitEvent} evento
 */
async function enviarCita(evento) {
  evento.preventDefault();
  botonAgendar.disabled = true;
  mensaje.className = 'mensaje';
  mensaje.textContent = '';

  try {
    const respuesta = await fetch(RUTA_CITAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leerFormulario())
    });
    const cuerpo = await respuesta.json().catch(() => ({}));

    if (respuesta.status === 201) {
      mostrarMensaje(`Cita agendada para ${cuerpo.nombreMascota} el ${cuerpo.fecha} a las ${cuerpo.hora}.`, 'exito');
      formulario.reset();
      campoFecha.min = obtenerHoyEnColombia();
      await cargarAgenda();
    } else if (respuesta.status === 409) {
      mostrarMensaje('Ese horario ya está ocupado. Elige otra hora u otro día.', 'error');
    } else if (respuesta.status === 400) {
      mostrarMensaje('Revisa estos datos:', 'error', cuerpo.detalles || []);
    } else {
      mostrarMensaje('No pudimos agendar la cita. Intenta de nuevo en unos minutos.', 'error');
    }
  } catch (error) {
    mostrarMensaje('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.', 'error');
  } finally {
    botonAgendar.disabled = false;
  }
}

cargarHoras();
campoFecha.min = obtenerHoyEnColombia();
formulario.addEventListener('submit', enviarCita);
cargarAgenda();
