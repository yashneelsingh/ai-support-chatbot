let ioInstance = null;
import jwt from 'jsonwebtoken';

export const initializeSocket = (io) => {
  ioInstance = io;
  
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = { id: decoded.id, role: decoded.role };
      } catch (err) {
        socket.user = null;
      }
    }
    next();
  });

  io.on('connection', (socket) => {
    if (socket.user?.role === 'admin') {
      socket.join('admins');
    }

    // Join a specific chat room
    socket.on('join_chat', (chatId) => {
      if (typeof chatId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(chatId)) return;
      socket.join(chatId);
    });

    // Handle human handoff requested by user or AI
    socket.on('request_handoff', (chatId) => {
      if (typeof chatId !== 'string' || !socket.rooms.has(chatId)) return;
      io.to('admins').emit('handoff_alert', { chatId, message: 'User requested human assistance' });
    });

    // Admin takes over
    socket.on('admin_takeover', (chatId) => {
      if (socket.user?.role !== 'admin') return;
      if (typeof chatId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(chatId)) return;
      socket.join(chatId);
      io.to(chatId).emit('chat_status_changed', { status: 'human', message: 'An agent has joined the chat.' });
    });

    // Send message directly via socket (used for human mode or streaming AI)
    socket.on('send_message', (data) => {
      if (!data || typeof data.chatId !== 'string' || typeof data.text !== 'string') return;
      if (!socket.rooms.has(data.chatId) || !data.text.trim() || data.text.length > 5000) return;
      const sender = socket.user?.role === 'admin' ? 'admin' : 'user';
      io.to(data.chatId).emit('receive_message', {
        chatId: data.chatId,
        sender,
        text: data.text.trim(),
      });
    });

    socket.on('disconnect', () => {});
  });
};

export const getIo = () => {
  if (!ioInstance) {
    throw new Error('Socket.io not initialized!');
  }
  return ioInstance;
};
