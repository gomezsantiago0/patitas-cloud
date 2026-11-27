/**
 * Error que se lanza cuando ya existe una cita en la fecha y hora solicitadas.
 */
class HorarioOcupadoError extends Error {
  constructor() {
    super('El horario seleccionado ya está ocupado.');
    this.name = 'HorarioOcupadoError';
  }
}

module.exports = { HorarioOcupadoError };
