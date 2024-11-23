// ..backend/server.js
const http = require('http');
const express = require('express');
const setUpSocket = require('./socket');
const dotenv = require('dotenv');   
const userRouter= require('./routes/userRoute');
const messageRouter = require('./routes/messageRoute');
const conversationRouter = require('./routes/conversationRoute'); 
const notificationRouter = require('./routes/notificationRoute');
const friendRouter = require('./routes/friendRoute');
require('./config/db');
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = require('socket.io')(server);
setUpSocket(io);
// app.set('socketio', io);
app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/messages', messageRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/friends', friendRouter);
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});