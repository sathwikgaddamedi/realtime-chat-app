const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html on root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store active users
const users = {};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Handle user joining
  socket.on('user_join', (username) => {
    users[socket.id] = username;
    console.log(`${username} joined the chat`);
    
    // Notify all users about the new user
    io.emit('user_list', Object.values(users));
    io.emit('notification', {
      message: `${username} joined the chat`,
      type: 'join'
    });
  });

  // Handle incoming messages
  socket.on('send_message', (data) => {
    const message = {
      username: users[socket.id],
      text: data,
      timestamp: new Date().toLocaleTimeString(),
      userId: socket.id
    };
    
    // Broadcast message to all users
    io.emit('receive_message', message);
    console.log(`Message from ${message.username}: ${message.text}`);
  });

  // Handle typing indicator
  socket.on('typing', (isTyping) => {
    socket.broadcast.emit('user_typing', {
      username: users[socket.id],
      isTyping: isTyping
    });
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const username = users[socket.id];
    delete users[socket.id];
    
    console.log(`${username} disconnected`);
    
    // Notify all users about the disconnection
    io.emit('user_list', Object.values(users));
    io.emit('notification', {
      message: `${username} left the chat`,
      type: 'leave'
    });
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`Socket error: ${error}`);
  });
});

// Server listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
