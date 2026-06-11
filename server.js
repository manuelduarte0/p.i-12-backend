const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Banco fake só pra teste. Depois troca por PostgreSQL
let usuarios = { "teste": { saldo: 5 } };
let salas = {};

app.get('/', (req, res) => {
  res.send('P.I-12 Backend Online');
});

// Gerar Pix - aqui tu integra Mercado Pago depois
app.post('/api/pix/gerar', (req, res) => {
  const { user, qtd } = req.body;
  if (qtd < 10) return res.status(400).json({ erro: 'Mínimo 10 ouro' });

  // Aqui tu chama a API do Mercado Pago e gera o QR Code
  // Por agora só simula:
  console.log(`Gerando Pix de R$${qtd} pro user ${user}`);
  res.json({
    status: 'ok',
    qr_code: 'pix-fake-123',
    msg: `Pague R$${qtd},00. Ouro cai em 2min`
  });
});

// Webhook do Mercado Pago chama aqui quando pagar
app.post('/webhook/pix', (req, res) => {
  const { user, valor_pago } = req.body;
  usuarios[user].saldo += valor_pago;
  console.log(`Creditei ${valor_pago} ouro pro ${user}`);
  res.sendStatus(200);
});

// Criar sala
app.post('/api/sala/criar', (req, res) => {
  const { user, nome } = req.body;
  if (usuarios[user].saldo < 1) return res.status(400).json({ erro: 'Saldo insuficiente' });

  usuarios[user].saldo -= 1;
  const idSala = nome || Math.random().toString(36).substr(2, 6);
  salas[idSala] = { dono: user, jogador2: null };

  res.json({
    status: 'ok',
    link: `https://seu-front.vercel.app/sala/${idSala}`,
    saldo_novo: usuarios[user].saldo
  });
});

// Socket.io pra jogo em tempo real
io.on('connection', (socket) => {
  console.log('Jogador conectou');

  socket.on('entrar_sala', (idSala) => {
    socket.join(idSala);
  });

  socket.on('mover_peca', ({ idSala, movimento }) => {
    socket.to(idSala).emit('oponente_moveu', movimento);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
