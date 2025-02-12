// server.js
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

// Clave secreta para autenticar las peticiones desde la PBX
const ASTERISK_SECRET = "mi_clave_secreta"; // Cambia este valor por uno robusto y mantenlo en secreto

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// Servir archivos estáticos desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Función auxiliar para registrar eventos con fecha y hora
function logEvent(message) {
  const now = new Date();
  console.log(`${now.toLocaleString()} - ${message}`);
}

// Cargar usuarios desde el archivo CSV
const usersFilePath = path.join(__dirname, 'users.csv');
let validUsers = {};  // Diccionario: username (o anexo) => password

try {
  const data = fs.readFileSync(usersFilePath, 'utf8');
  const lines = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const header = lines[0].split(',');
  if (header[0].toLowerCase().includes('username')) {
    lines.shift();
  }
  lines.forEach(line => {
    const [username, password] = line.split(',');
    if (username && password) {
      validUsers[username.trim()] = password.trim();
    }
  });
  logEvent(`Usuarios cargados: ${JSON.stringify(validUsers)}`);
} catch (err) {
  logEvent(`Error al leer el archivo users.csv: ${err}`);
}

// Diccionario para almacenar los sockets de usuarios conectados: { username: socket }
let userSockets = {};

// Endpoint API para enviar el comando de abrir pestaña (para pruebas o integración manual)
// Se espera un JSON con: { "username": "user1", "url": "https://www.example.com" }
app.post('/open-tab', (req, res) => {
  const { username, url } = req.body;

  if (!username || !url) {
    logEvent(`Petición /open-tab con parámetros insuficientes.`);
    return res.status(400).send('Faltan parámetros: username y url son requeridos.');
  }

  const targetSocket = userSockets[username];
  if (targetSocket) {
    targetSocket.emit('open-tab', { url });
    logEvent(`Se envió el comando para abrir la URL ${url} al usuario ${username}`);
    res.send(`Comando enviado al usuario ${username}.`);
  } else {
    logEvent(`El usuario ${username} no está conectado.`);
    res.status(404).send(`El usuario ${username} no está conectado.`);
  }
});

// Endpoint para recibir llamadas desde Asterisk vía webhook
// Se espera un JSON con: { "extension": "101", "url": "https://www.example.com/infoLlamada" }
app.post('/asterisk-call', (req, res) => {
  // Validar la autenticidad de la petición mediante la cabecera X-API-Key
  const apiKey = req.get('X-API-Key');
  if (apiKey !== ASTERISK_SECRET) {
    logEvent(`[ASTERISK CALL] Petición no autorizada.`);
    return res.status(401).send('No autorizado');
  }

  const { extension, url } = req.body;
  if (!extension || !url) {
    logEvent(`[ASTERISK CALL] Petición con parámetros insuficientes.`);
    return res.status(400).send('Faltan parámetros: extension y url son requeridos.');
  }

  const targetSocket = userSockets[extension];
  if (targetSocket) {
    targetSocket.emit('open-tab', { url });
    logEvent(`[ASTERISK CALL] Se envió el comando para abrir la URL ${url} al anexo ${extension}`);
    res.send(`Comando enviado al anexo ${extension}.`);
  } else {
    logEvent(`[ASTERISK CALL] El anexo ${extension} no está conectado.`);
    res.status(404).send(`El anexo ${extension} no está conectado.`);
  }
});

// Manejar conexiones con Socket.io
io.on('connection', (socket) => {
  logEvent(`Cliente conectado: ${socket.id}`);

  // Evento de login
  socket.on('login', (data) => {
    logEvent(`Intento de login: ${JSON.stringify(data)}`);
    const { username, password } = data;

    // Validar credenciales (se asume que el username corresponde al anexo)
    if (validUsers[username] && validUsers[username] === password) {
      socket.username = username;
      userSockets[username] = socket;
      socket.emit('loginSuccess', { message: `¡Bienvenido, ${username}!` });
      logEvent(`Usuario ${username} logueado exitosamente.`);
    } else {
      socket.emit('loginFailure', { message: 'Usuario o contraseña incorrectos.' });
      logEvent(`Fallo en el login para el usuario ${username}`);
    }
  });

  // Manejar desconexiones
  socket.on('disconnect', () => {
    logEvent(`Cliente desconectado: ${socket.id}`);
    if (socket.username) {
      delete userSockets[socket.username];
      logEvent(`Se eliminó la conexión del usuario ${socket.username}`);
    }
  });
});

// Iniciar el servidor
const PORT = 3000;
http.listen(PORT, () => {
  logEvent(`Servidor corriendo en http://localhost:${PORT}`);
});
