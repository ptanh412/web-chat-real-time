// ..backend/server.js
const http = require('http');
const express = require('express');
const cors = require('cors');
const setUpSocket = require('./socket/socket');
const dotenv = require('dotenv');   
const userRouter= require('./routes/userRoute');
const messageRouter = require('./routes/messageRoute');
const conversationRouter = require('./routes/coservationRoute'); 
const notificationRouter = require('./routes/notificationRoute');
const friendRouter = require('./routes/friendshipRoute');
const uploadRouter = require('./routes/uploadFileRoute');
const loginGoogleRouter = require('./routes/loginGoogle');
require('./config/db');
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = setUpSocket(server);
app.set('socketio', io);
app.use(cors({
    origin: 'http://localhost:3000',
}));
app.use(express.json());
app.use('/api/users', userRouter);
app.use('/api/messages', messageRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/friends', friendRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/auth', loginGoogleRouter);
const PORT = 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});