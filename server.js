const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*", // libera pro GitHub Pages acessar
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const rooms = {};

app.get('/', (req, res) => res.send('P.I-12 Backend Online'));

io.on('connection', (socket) => {
  console.log('User conectado:', socket.id);

  socket.on('createRoom', ({ playerName }) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName, isHost: true }]
    };
    socket.join(roomCode);
    socket.emit('roomCreated', { roomCode, players: rooms[roomCode].players });
    console.log(`Sala criada: ${roomCode}`);
  });

  socket.on('joinRoom', ({ playerName, roomCode }) => {
    if (!rooms[roomCode]) return socket.emit('error', 'Sala não encontrada');
    rooms[roomCode].players.push({ id: socket.id, name: playerName, isHost: false });
    socket.join(roomCode);
    socket.emit('joinedRoom', { roomCode, players: rooms[roomCode].players });
    io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
  });

  socket.on('startGame', ({ roomCode }) => {
    io.to(roomCode).emit('gameStarted');
  });

  socket.on('disconnect', () => {
    for (const roomCode in rooms) {
      rooms[roomCode].players = rooms[roomCode].players.filter(p => p.id!== socket.id);
      if (rooms[roomCode].players.length === 0) delete rooms[roomCode];
      else io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    }
  });
});

http.listen(PORT, () => console.log(`Server rodando na porta ${PORT}`));
