require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Usuario = require('./models/usuario');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

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

    // 🔐 Generar token
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

    // 🔐 Generar token
    const token = jwt.sign(
      { id: usuario._id, nombre: usuario.nombre },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.json({ success: true, token, nombre: usuario.nombre });
  } catch (err) {
    console.error('❌ Error al hacer login:', err);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
  }
});

// ▶️ Arranque del servidor
app.listen(PORT, () => {
  console.log(`🌿 Servidor escuchando en puerto ${PORT}`);
});
