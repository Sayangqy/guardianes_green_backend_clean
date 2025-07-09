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

const Usuario = require('./models/usuario');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Servir imágenes

// 🔌 Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error conectando a MongoDB:', err));

// 🧾 Ruta: Registro
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

    res.json({ success: true, message: 'Registrado exitosamente', token });
  } catch (err) {
    console.error('❌ Error al registrar:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// 🔐 Ruta: Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('📥 Intento de login con:', email, password);

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


// 🌍 MODELO: Reporte (interno)
const mongooseReporteSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  ubicacion: {
    lat: Number,
    lng: Number,
  },
  imagen: { type: String }, // Ruta del archivo
});

const Reporte = mongoose.model('Reporte', mongooseReporteSchema);

// 📂 Configuración de almacenamiento
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

// 📩 Ruta: Subida de reportes
app.post('/api/reportes', upload.single('imagen'), async (req, res) => {
  try {
    const { lat, lng, usuarioId } = req.body;
    const imagenPath = req.file ? req.file.path : null;

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

// 📥 Ruta: Obtener reportes por usuario
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

// ▶️ Arranque del servidor
app.listen(PORT, () => {
  console.log(`🌿 Servidor escuchando en puerto ${PORT}`);
});
