const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuración de sesión
app.use(session({
  secret: 'supersecreto',
  resave: false,
  saveUninitialized: true
}));

// Cargar usuarios desde CSV
let users = {};

function loadUsers() {
  return new Promise((resolve, reject) => {
    fs.createReadStream('users.csv')
      .pipe(csv())
      .on('data', (row) => {
        users[row.username] = {
          password: row.password,
          extension: row.extension
        };
      })
      .on('end', () => {
        console.log('Usuarios cargados desde CSV');
        resolve();
      })
      .on('error', (error) => {
        console.error('Error leyendo CSV:', error);
        reject(error);
      });
  });
}

// Middleware de autenticación
function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login');
}

// Rutas
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/views/login.html');
});

app.post('/login', express.urlencoded({ extended: true }), async (req, res) => {
  const { username, password } = req.body;
  
  if (users[username] && users[username].password === password) {
    req.session.user = { 
      username, 
      extension: users[username].extension 
    };
    res.redirect('/dashboard');
  } else {
    res.redirect('/login?error=1');
  }
});


app.get('/dashboard', checkAuth, (req, res) => {
  res.sendFile(__dirname + '/views/dashboard.html');
});

// WebSocket
io.on('connection', (socket) => {
  const user = socket.request.session.user;
  
  if (user) {
    socket.join(`extension_${user.extension}`);
    console.log(`Agente ${user.username} (${user.extension}) conectado`);
  }
});

// Iniciar servidor después de cargar usuarios
loadUsers()
  .then(() => {
    server.listen(3000, () => {
      console.log('Servidor en http://localhost:3000');
    });
  })
  .catch(error => {
    console.error('No se pudo iniciar el servidor:', error);
    process.exit(1);
  });

// Función para enviar comandos
function sendCommand(extension, command) {
  io.to(`extension_${extension}`).emit('command', command);
}