const mongoose = require('mongoose');

const reporteSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  ubicacion: {
    lat: Number,
    lng: Number,
  },
  imagen: { type: String }, // ruta local del archivo
});

module.exports = mongoose.model('Reporte', reporteSchema);
