const { crearManejadorCitas } = require('../src/manejadores');
const repositorioCitas = require('../src/repositorioCitas');

module.exports = crearManejadorCitas(repositorioCitas);
