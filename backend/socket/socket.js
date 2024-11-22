// ../backend/socket.js
const { Server } = require('socket.io');
const User = require('../models/Users');
const socketAuth = require('../middlewares/socketAuth');
const setUpSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
        }
    });
    io.use(socketAuth);

    const onlineUsers = new Map();

    io.on("connection", async (socket) => {
        try {
            const userId = socket.user._id;
            console.log(`User ${userId} connected`);
            if (!onlineUsers.has(userId)) {
                onlineUsers.set(userId, 1);
                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        status: 'online',
                        lastActive: new Date()
                    },
                    { new: true }
                )
                console.log(`User ${userId} is online`, updatedUser.status);
                io.emit('user:online', {
                    userId,
                    status: updatedUser.status,
                    lastActive: updatedUser.lastActive
                })
            }else{
                const connectionCount = onlineUsers.get(userId) + 1;
                onlineUsers.set(userId, connectionCount);
                console.log(`User ${userId} is online. Connection count: ${connectionCount}`);
            }
            
            // Join room cá nhân
            socket.join(`user:${userId}`);
            // Xử lý join room conversation
            socket.on('join:conversation', (conversationId) =>{
                socket.join(`conversation:${conversationId}`);
                console.log(`User ${userId} joined conversation ${conversationId}`);
            })
            socket.on('leave:conversation', (conversationId) =>{
                socket.leave(`conversation:${conversationId}`);
                console.log(`User ${userId} left conversation ${conversationId}`);
            })
            // Xử lý tin nhắn
            socket.on('message:send', (message) =>{
                io.to(`conversation:${message.conversationId}`).emit('message:sent', message);
                io.to(`user:${message.conversationId}`).emit('message:received', message);
            })
            socket.on('message:read', (messageId) =>{
                io.emit('message:read', { messageId, userId });
            })
            socket.on('message:received', (messageId) =>{
                io.emit('message:received', { messageId, userId });
            })

            // Xử lý disconnect
            socket.on('disconnect', async () => {
                try {
                    const newCount = onlineUsers.get(userId) - 1;
                    
                    if (newCount <= 0) {
                        // Cập nhật trạng thái offline khi không còn connection nào
                        await User.findByIdAndUpdate(userId, 
                            { 
                                status: 'offline',
                                lastActive: new Date()
                            }, 
                            { new: true }
                        );
                        
                        onlineUsers.delete(userId);
                        // Broadcast trạng thái offline
                        io.emit('user:offline', { userId });
                        console.log(`User ${userId} is offline`);
                    } else {
                        onlineUsers.set(userId, newCount);
                        console.log(`User ${userId} connection closed. Remaining connections: ${newCount}`);
                    }
                } catch (error) {
                    console.error('Error in disconnect handler:', error);
                }
            });
            // Xử lý lỗi socket
            socket.on('error', (error) => {
                console.error('Socket error:', error);
            });

        } catch (error) {
            console.error('Error in connection handler:', error);
            socket.disconnect(true);
        }
    });
    // Xử lý lỗi của io server
    io.engine.on('connection_error', (error) => {
        console.error('Connection error:', error);
    });

    return io;
}

module.exports = setUpSocket;