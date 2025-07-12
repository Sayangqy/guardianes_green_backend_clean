require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Modelos
const Usuario = require('./models/usuario');
const Noticia = require('./models/noticia'); // ✅ Correcto uso

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Imágenes estáticas

// 🔌 Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error conectando a MongoDB:', err));

// 🧾 Registro
app.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
  }

  try {
    const existente = await Usuario.findOne({ email: email.toLowerCase() });
    if (existente) {
      return res.status(400).json({ success: false, message: 'Usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevo = new Usuario({ nombre, email: email.toLowerCase(), password: hashedPassword });
    await nuevo.save();

    const token = jwt.sign(
      { id: nuevo._id, nombre: nuevo.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({
      success: true,
      message: 'Registrado exitosamente',
      token,
      usuarioId: nuevo._id,
      nombre: nuevo.nombre
    });
  } catch (err) {
    console.error('❌ Error al registrar:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// 🔐 Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email: email.toLowerCase() });

    if (!usuario) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, usuario.password);

    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, token, nombre: usuario.nombre, usuarioId: usuario._id });
  } catch (err) {
    console.error('❌ Error al hacer login:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// 🌍 MODELO: Reporte
const mongooseReporteSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  ubicacion: {
    lat: Number,
    lng: Number,
  },
  imagen: { type: String },
});
const Reporte = mongoose.model('Reporte', mongooseReporteSchema);

// 📂 Multer: Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `reporte_${Date.now()}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

// 📩 Subida de reportes
app.post('/api/reportes', upload.single('imagen'), async (req, res) => {
  try {
    const { lat, lng, usuarioId } = req.body;
    const imagenPath = req.file ? req.file.path : null;

    if (!usuarioId || !lat || !lng) {
      return res.status(400).json({ ok: false, mensaje: 'Faltan datos obligatorios' });
    }

    const nuevoReporte = new Reporte({
      usuarioId,
      fecha: new Date(),
      ubicacion: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      },
      imagen: imagenPath,
    });

    await nuevoReporte.save();

    res.status(201).json({
      ok: true,
      mensaje: 'Reporte guardado exitosamente',
      data: nuevoReporte,
    });
  } catch (error) {
    console.error('❌ Error en /api/reportes:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al guardar el reporte' });
  }
});

// 📄 Obtener reportes por usuario
app.get('/api/reportes', async (req, res) => {
  try {
    const { usuarioId } = req.query;

    if (!usuarioId) {
      return res.status(400).json({ ok: false, mensaje: 'usuarioId es requerido' });
    }

    const reportes = await Reporte.find({ usuarioId }).sort({ fecha: -1 });

    res.json({
      ok: true,
      data: reportes,
    });
  } catch (error) {
    console.error('❌ Error en GET /api/reportes:', error);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener los reportes' });
  }
});

// 📰 Crear noticia
app.post('/api/noticias', async (req, res) => {
  try {
    const { titulo, resumen, contenido, imagen } = req.body;

    const noticia = new Noticia({ titulo, resumen, contenido, imagen });
    await noticia.save();

    res.json({ ok: true, data: noticia });
  } catch (err) {
    console.error('❌ Error al crear noticia:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al crear noticia' });
  }
});

// 📰 Obtener noticias
app.get('/api/noticias', async (req, res) => {
  try {
    const noticias = await Noticia.find().sort({ fecha: -1 });
    res.json({ ok: true, data: noticias });
  } catch (err) {
    console.error('❌ Error al obtener noticias:', err);
    res.status(500).json({ ok: false, mensaje: 'Error al obtener noticias' });
  }
});

// ▶️ Arranque del servidor
app.listen(PORT, () => {
  console.log(`🌿 Servidor escuchando en puerto ${PORT}`);
});
