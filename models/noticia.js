const mongoose = require('mongoose');

const NoticiaSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  resumen: { type: String },
  contenido: { type: String, required: true },
  imagen: { type: String },
  fecha: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Noticia || mongoose.model('Noticia', NoticiaSchema);
