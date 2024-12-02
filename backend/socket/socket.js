// ../backend/socket.js
const { Server } = require('socket.io');
const User = require('../models/Users');
const Message = require('../models/Messages');
const Conversation = require('../models/Conservations');
const messageService = require('../services/messageService');
const notificationService = require('../services/notificationService');
const friendshipService = require('../services/friendshipService');
const socketAuth = require('../middlewares/socketAuth');
const setUpSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    io.use(socketAuth);
    const onlineUsers = new Map();
    const pendingRequests = new Map();

    io.on("connection", async (socket) => {
        console.log('Server: New socket connection', {
            socketId: socket.id,
            userId: socket?.user?._id,
            rooms: Array.from(socket.rooms)
        });
        socket.on('getRooms', () => {
            const rooms = Array.from(socket.rooms);
            socket.emit('roomsList', rooms);
        });

        try {
            const userId = socket?.user?._id;
            if (!userId) {
                console.error("Invalid userId in socket connection.");
                socket.disconnect(true);
                return;
            }
            console.log(`User ${userId} connected`);
            socket.on('joinRoom', (room) => {
                socket.join(room);
                console.log('Server: Socket joined room', {
                    socketId: socket.id,
                    room: room,
                    allRooms: Array.from(socket.rooms)
                });
            });
            socket.emit('roomsList', Array.from(socket.rooms));

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
                io.emit('user:online', {
                    userId,
                    status: updatedUser.status,
                    lastActive: updatedUser.lastActive
                })
            } else {
                const connectionCount = onlineUsers.get(userId) + 1;
                onlineUsers.set(userId, connectionCount);
                io.emit('user:online',{
                    userId,
                    status: 'online',
                    lastActive: new Date()
                })
            }
            socket.on('get:users', async () => {
                try {
                    const users = await User.find({ _id: { $ne: userId } });
                    socket.emit('users:list', users);
                } catch (error) {
                    console.error('Error in get users handler:', error);
                }
            });
            socket.on('get:lastest-message', async (userId, callback) => {
                try {
                    const conversation = await Conversation.findOne({
                        participants: { $all: [userId, socket.user._id] }
                    })
                    if (!conversation) {
                        return callback(null);
                    }
                    const message = await Message.findOne({ conversationId: conversation._id }).sort({ createdAt: -1 });
                    callback(message);
                } catch (error) {
                    console.error('Error in get latest message handler:', error);
                }
            });

            // Xử lý join room conversation
            socket.on('join:conversation', async (conversationId) => {
                try {
                    const conversation = await Conversation.findById(conversationId);
                    if (!conversation.participants.includes(userId)) {
                        throw new Error('User is not a participant of this conversation');
                    }
                    socket.join(`conversation:${conversationId}`);
                    console.log(`User ${userId} joined conversation ${conversationId}`);
                } catch (error) {
                    console.error('Error in join conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
                console.log(`User ${userId} joined conversation ${conversationId}`);
            })

            // Xử lý leave room conversation
            socket.on('leave:conversation', (conversationId) => {
                socket.leave(`conversation:${conversationId}`);
                console.log(`User ${userId} left conversation ${conversationId}`);
            })

            // Xử lý tin nhắn
            socket.on('message:send', async (message) => {
                try {
                    const { conversationId, content, type, attachments } = message;
                    const conversation = await Conversation.findById(conversationId);
                    if (!conversation.participants.includes(userId)) {
                        return socket.emit('error', { message: 'User is not a participant of this conversation' });
                    }
                    const newMessage = await messageService.createMessage({ conversationId, sender: userId, content, type, attachments });
                    io.to(`conversation:${message.conversationId}`).emit('message:sent', newMessage);
                } catch (error) {
                    console.error('Error in send message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('message:read', async (messageId) => {
                try {
                    const message = await Message.findByIdAndUpdate(
                        messageId,
                        { status: 'read' },
                        { new: true }
                    );
                    if (message) {
                        io.to(`conversation:${message.conversationId}`).emit('message:read', {
                            messageId: message._id,
                            userId: message.sender
                        });
                    }
                } catch (error) {
                    console.error('Error in read message handler:', error);
                }
            })
            socket.on('message:received', async (messageId) => {
                try {
                    const message = await Message.findByIdAndUpdate(
                        messageId,
                        { status: 'received' },
                        { new: true }
                    );
                    if (message) {
                        io.to(`conversation:${message.conversationId}`).emit('message:received', {
                            messageId: message._id,
                            userId: message.sender
                        });
                    }
                } catch (error) {
                    console.error('Error in received message handler:', error);
                }
            })
            //Gui thong bao
            socket.on('notification:send', async ({ userId, type, referenceId, content }) => {
                try {
                    const notification = await notificationService.createNotification({ userId, type, referenceId, content });
                    io.to(`user:${userId}`).emit('notification:receive', notification);
                    console.log(`Notification sent to user ${userId}`);
                } catch (error) {
                    console.log('Error in send notification handler:', error);
                }
            })

            //Danh dau thong bao da doc
            socket.on('notification:read', async ({ notificationId, userId }) => {
                try {
                    await notificationService.markNotificationAsRead(notificationId);
                    io.to(`user:${userId}`).emit('notification:read', notificationId);
                    console.log(`Notification ${notificationId} marked as read for user ${userId}`);
                } catch (error) {

                }
            })
            socket.on('friend:request', async ({ recipientId, requesterId, message }) => {
                console.log('Friend request received on server:', {
                    recipientId,
                    requesterId,
                    message
                });
                // const requesterId = socket.user._id;
                const requestKey = `${requesterId}-${recipientId}`;

                if (pendingRequests.has(requestKey)) {
                    console.log('Duplicate request blocked');
                    return socket.emit('error', { message: 'Friend request already sent and is pending' });
                }

                try {
                    pendingRequests.set(requestKey, true);

                    const existingRequest = await friendshipService.checkExistingRequest(requesterId, recipientId);
                    if (existingRequest) {
                        return socket.emit('error', { message: 'Friend request already sent and is pending' });
                    }

                    const friendship = await friendshipService.senderFriendRequest(requesterId, recipientId);
                    const notification = await notificationService.createNotification({
                        userId: recipientId,
                        type: 'friend_request',
                        referenceId: requesterId,
                        content: `${socket.user.name} sent you a friend request`
                    });
                    console.log("Notification created:", notification);
                    io.to(`user:${recipientId}`).emit('notification:receive', notification);
                    console.log('Server: Emitting notification to specific room', {
                        recipientRoom: `user:${recipientId}`,
                        notificationId: notification._id,
                        content: notification.content,
                        socketRooms: Array.from(socket.rooms)
                    });
                    console.log(`Friend request sent from ${requesterId} to ${recipientId}`);
                    console.log('Emitted notification data:', JSON.stringify(notification, null, 2));
                } catch (error) {
                    console.error('Error in friend request handler:', error);
                    socket.emit('error', {
                        message: error.message,
                        details: error.toString()
                    });
                } finally {
                    pendingRequests.delete(requestKey);
                }
            });

            // Chap nhan yeu cau ket ban
            socket.on('friend:accept', async ({ friendshipId }) => {
                try {
                    const friendship = await friendshipService.acceptFriendRequest(friendshipId);
                    const { requester, reciptient } = friendship;
                    io.to(`user:${requester}`).emit('friend:accept', friendship);
                    io.to(`user:${reciptient}`).emit('friend:accept', friendship);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            })
            //Tu coi yeu cau ket ban
            socket.on('friend:reject', async ({ friendshipId }) => {
                try {
                    const friendship = await friendshipService.rejectedFriendRequest(friendshipId);
                    io.to(`user:${friendship.requester}`).emit('friend:reject', friendship);
                } catch (error) {
                    console.log('Error in reject friend request handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            // Xử lý disconnect
            socket.on('disconnect', async () => {
                try {
                    const newCount = (onlineUsers.get(userId) || 0) - 1;

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