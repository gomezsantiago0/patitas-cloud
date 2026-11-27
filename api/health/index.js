const { crearManejadorSalud } = require('../src/manejadores');
const repositorioCitas = require('../src/repositorioCitas');

module.exports = crearManejadorSalud(repositorioCitas);
