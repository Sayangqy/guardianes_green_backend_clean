require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const Usuario = require('./models/usuario');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Conexión MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch((err) => console.error('❌ Error conectando a MongoDB:', err));

// Rutas
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('📥 Intento de login con:', email, password);

  const usuario = await Usuario.findOne({ email });
  if (!usuario) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }

  const validPassword = await bcrypt.compare(password, usuario.password); // 👈 Compara encriptada

  if (!validPassword) {
    return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
  }

  res.json({ success: true, token: 'fake-token', nombre: usuario.nombre });
});


const bcrypt = require('bcryptjs');

app.post('/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
  }

  const existente = await Usuario.findOne({ email });
  if (existente) {
    return res.status(400).json({ success: false, message: 'Usuario ya existe' });
  }

  const hashedPassword = await bcrypt.hash(password, 10); // 👈 Encriptar

  const nuevo = new Usuario({ nombre, email, password: hashedPassword });
  await nuevo.save();

  res.json({ success: true, message: 'Registrado exitosamente', token: 'fake-register-token' });
});

// Arranca server
app.listen(PORT, () => {
  console.log(`🌿 Servidor escuchando en puerto ${PORT}`);
});
