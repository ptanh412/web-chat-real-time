// ..backend/server.js
const http = require('http');
const express = require('express');
const setUpSocket = require('./socket');
const dotenv = require('dotenv');   
const userRouter= require('./routes/userRoute');
require('./config/db');
dotenv.config();

const app = express();
const server = http.createServer(app);

const io = setUpSocket(server);
app.set('socketio', io);
app.use(express.json());
app.use('/api/users', userRouter);
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});