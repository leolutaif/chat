const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

// Conectando ao MongoDB Atlas
mongoose.connect('mongodb+srv://leoprodutor:nuJiIYBLiS34ZsQe@chat.c0yyw.mongodb.net/?retryWrites=true&w=majority&appName=chat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log("Conectado ao MongoDB Atlas");
}).catch(err => {
  console.error("Erro ao conectar ao MongoDB:", err);
});

// Definindo o modelo de Mensagem
const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  image: String, // Campo para a URL da imagem
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Inicializando o servidor
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://tokenchat.netlify.app", // URL do frontend hospedado no Netlify
    methods: ["GET", "POST"]
  }
});

app.use(cors());

let users = [];

// Gerencia as conexões de socket
io.on('connection', async (socket) => {
  console.log('Novo usuário conectado:', socket.id);

  // Quando o usuário se junta, envia as mensagens anteriores para ele
  socket.on('join', async (nickname) => {
    users.push({ id: socket.id, nickname });

    // Recupera as últimas mensagens do banco de dados
    const previousMessages = await Message.find().sort({ timestamp: 1 }).limit(50);
    socket.emit('previousMessages', previousMessages); // Envia as mensagens anteriores ao novo usuário
    io.emit('userList', users); // Envia a lista atualizada para todos os usuários
  });

  // Recebe mensagens dos usuários e as armazena no banco de dados
  socket.on('message', async (message) => {
    const newMessage = new Message(message);
    await newMessage.save(); // Armazena a nova mensagem no MongoDB

    io.emit('message', message); // Envia a mensagem para todos os usuários conectados
  });

  // Gerencia a desconexão
  socket.on('disconnect', () => {
    users = users.filter(user => user.id !== socket.id);
    io.emit('userList', users); // Envia a lista atualizada para todos os usuários
    console.log('Usuário desconectado:', socket.id);
  });
});

// Porta do servidor
const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
