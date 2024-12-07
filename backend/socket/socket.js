// ../backend/socket.js
const { Server } = require('socket.io');
const mongoose = require('mongoose');
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
                io.emit('user:online', {
                    userId,
                    status: 'online',
                    lastActive: new Date()
                })
            }
            socket.on('get:all-users', async () => {
                try {
                    console.log('Get all users request received, userId:', userId);

                    if (!userId) {
                        console.error('No userId found');
                        socket.emit('users:list', []);
                        return;
                    }

                    const [users, conversations] = await Promise.all([
                        User.find({ _id: { $ne: userId } }).select('name avatar status lastActive'),
                        Conversation.find({
                            participants: userId
                        }).populate('participants', '_id')
                    ])
                    const conversedUserIds = new Set();
                    const lastMessagesMap = {};
                    for (const conv of conversations) {
                        conv.participants.forEach(p => {
                            if (p._id.toString() !== userId.toString()) {
                                conversedUserIds.add(p._id.toString());
                                Message.findOne({
                                    conversationId: conv._id,
                                    $or: [
                                        { sender: userId },
                                        { sender: p._id }
                                    ]
                                })
                                    .sort({ createdAt: -1 })
                                    .populate('sender', 'name avatar')
                                    .then(message => {
                                        lastMessagesMap[p._id.toString()] = message || null;
                                    });
                            }
                        })
                    }

                    const enrichedUsers = users.map(user => ({
                        _id: user._id,
                        name: user.name,
                        avatar: user.avatar,
                        status: user.status,
                        lastActive: user.lastActive,
                        hasConversation: conversedUserIds.has(user._id.toString()),
                        lastMessage: lastMessagesMap[user._id.toString()] || 'No message',
                        lastMessageSenderName: lastMessagesMap[user._id.toString()]?.senderName || 'No sender',
                    }));
                    if (enrichedUsers.length === 0) {
                        console.log('No users found');
                    }
                    socket.emit('users:list', enrichedUsers);
                } catch (error) {
                    console.error('Error in get users handler:', error);
                    socket.emit('users:error', error.message);
                    socket.emit('users:list', []);
                }
            });

            socket.on('get:lastest-message', async (recipientId, callback) => {
                try {
                    const conversation = await Conversation.findOne({
                        participants: { $all: [userId, recipientId] }
                    })
                    if (!conversation) {
                        return callback(null);
                    }
                    const message = await Message.findOne({ conversationId: conversation._id })
                        .sort({ createdAt: -1 }).populate('sender', 'name avatar');
                    if (message) {
                        callback({
                            content: message.content,
                            senderName: message.sender.name,
                            senderId: message.sender._id,
                        })
                    } else {
                        callback(null);
                    }
                    // callback(message);
                } catch (error) {
                    console.error('Error in get latest message handler:', error);
                }
            });

            socket.on('create:conversation', async ({ receiverId, content }) => {
                try {
                    let conversation = await Conversation.findOne({
                        type: 'private',
                        participants: { $all: [userId, receiverId] }
                    });

                    if (!conversation) {
                        conversation = new Conversation({
                            type: 'private',
                            participants: [userId, receiverId],
                            creator: userId,
                        });
                        await conversation.save();
                    }
                    if (content) {
                        const message = new Message({
                            conversationId: conversation._id,
                            sender: userId,
                            content: content,
                            type: 'text'
                        });
                        await message.save();
                        conversation.lastMessage = message._id;
                        await conversation.save();
                    }

                    await conversation.populate({
                        path: 'participants',
                        select: 'name avatar status lastActive'
                    })

                    const enrichedConversation = {
                        _id: conversation._id.toString(),
                        participants: conversation.participants,
                        lastMessage: conversation.lastMessage || null,
                    }
                    console.log('Emitted Conversation:', enrichedConversation);
                    socket.emit('conversation:created', enrichedConversation);

                } catch (error) {
                    console.error('Error in create conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });
            socket.on('get:conversations', async (userId) => {
                try {
                    const conversations = await Conversation.find({
                        participants: userId
                    })
                        .populate({
                            path: 'participants',
                            select: 'name avatar status lastActive'
                        })
                        .populate({
                            path: 'lastMessage',
                            populate: {
                                path: 'sender',
                                select: 'name avatar status lastActive'
                            }
                        });

                    const enrichedConversations = conversations.map(conv => {
                        const otherParticipant = conv.participants.find(p => p._id.toString() !== userId.toString());
                        return {
                            _id: conv._id.toString(),
                            otherParticipant: otherParticipant ? {
                                _id: otherParticipant._id,
                                name: otherParticipant.name,
                                avatar: otherParticipant.avatar,
                                status: otherParticipant.status,
                                lastActive: otherParticipant.lastActive
                            } : null,
                            lastMessage: conv.lastMessage,
                            type: conv.type,
                        };
                    });
                    console.log('id conversation', enrichedConversations._id)
                    socket.emit('conversations:list', enrichedConversations);
                } catch (error) {
                    console.error('Error in get conversations handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });
            // Xử lý join room conversation
            socket.on('join:conversation', async (conversationId) => {
                try {

                    const conversation = await Conversation.findById(conversationId).populate('participants', '_id');
                    if (!conversation) {
                        throw new Error('Conversation not found');
                    }
                    console.log('Checking participants:', {
                        userId,
                        participants: conversation.participants.map(p => p._id.toString()),
                    });

                    if (!conversation.participants.map(p => p._id.toString()).includes(userId.toString())) {
                        throw new Error('User is not a participant of this conversation');
                    }
                    const unreadMessages = await Message.find({
                        conversationId: conversationId,
                        sender: { $ne: userId },
                        status: { $ne: 'read' }
                    })

                    if (unreadMessages.length > 0) {
                        await Message.updateMany({
                            _id: { $in: unreadMessages.map(m => m._id) },
                            status: { $ne: 'read' }
                        }, {
                            status: 'read',
                            readAt: new Date()
                        });
                        await Conversation.findByIdAndUpdate(conversationId, {
                            unreadCount: 0,
                            $currentDate: { updatedAt: true }
                        })

                        io.to(`conversation:${conversationId}`).emit('message:mark-read', {
                            conversationId,
                            messageIds: unreadMessages.map(m => m._id)
                        })
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
            socket.on('send:message', async ({ conversationId, content }, callback) => {
                try {
                    if (!conversationId || !content) {
                        throw new Error('Invalid message data');
                    }
                    const conversation = await Conversation.findById(conversationId).populate('participants');
                    const recipientId = conversation.participants.find(p => p._id.toString() !== userId.toString())?._id;

                    const recipientSocketInRoom = await io.in(`conversation:${conversationId}`).fetchSockets();
                    const isRecipientInRoom = recipientSocketInRoom.some(
                        s => s.user?._id?.toString() === recipientId?.toString()
                    )
                    console.log('Recipient in room:', isRecipientInRoom);
                    const message = new Message({
                        conversationId,
                        sender: userId,
                        content,
                        type: 'text',
                        status: isRecipientInRoom ? 'read' : (onlineUsers.has(recipientId) ? 'delivered' : 'sent'),
                        // createdAt: new Date(),
                        sentAt: new Date(),
                        readBy: isRecipientInRoom ? {
                            user: recipientId,
                            readAt: new Date()
                        } : null
                    })
                    await message.save();

                    await message.populate('sender', 'name avatar _id');

                    const conversations = await Conversation.findByIdAndUpdate(
                        conversationId,
                        {
                            lastMessage: message._id,
                            updatedAt: new Date()
                        },
                        {
                            new: true
                        }
                    )
                    io.to(`conversation:${conversationId}`).emit('new:message', {
                        ...message.toObject(),
                        sender: {
                            _id: message.sender._id,
                            name: message.sender.name,
                            avatar: message.sender.avatar
                        },
                        sentAt: message.sentAt
                    });
                    if (callback) {
                        callback(null, message);
                    }
                    console.log('Message sent:', message);
                } catch (error) {
                    console.error('Error in send message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('get:messages', async (conversationId, callback) => {
                console.log('Received conversationId:', conversationId);
                try {
                    const messages = await Message.find({ conversationId })
                        .populate('sender', 'name avatar')
                        .sort({
                            createdAt: 1,
                        });
                    if (callback) {
                        callback(messages);
                    } else {
                        socket.emit('messages:list', messages);
                    }
                } catch (error) {
                    console.error('Error in get messages handler:', error);
                }
            });
            socket.on('message:mark-read', async (conversationId) => {
                try {
                    const validConversationId = new mongoose.Types.ObjectId(conversationId);
                    const unreadMessages = await Message.find({
                        conversationId: validConversationId,
                        sender: { $ne: userId },
                        status: { $ne: 'read' }
                    });
                    if (unreadMessages.length > 0) {
                        io.in(`conversation:${conversationId}`).emit('message:mark-read', {
                            conversationId: validConversationId.toString(),
                            messageIds: unreadMessages.map(m => m._id),
                            status: 'read',
                            readAt: new Date()
                        })
                        await Message.updateMany(
                            {
                                _id: { $in: unreadMessages.map(m => new mongoose.Types.ObjectId(m._id)) },
                                status: { $ne: 'read' }
                            },
                            {
                                status: 'read',
                                readAt: new Date()
                            }
                        );
                    }
                } catch (error) {
                    console.error('Error in mark read handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('message:read', async (data) => {
                try {
                    const validConversationId = new mongoose.Types.ObjectId(
                        typeof data === 'string' ? data : data.conversationId
                    );
                    const conversation = await Conversation.findById(validConversationId);

                    if (!conversation) {
                        throw new Error('Conversation not found');
                    }
                    const unreadMessages = await Message.find({
                        conversationId: validConversationId,
                        sender: { $ne: userId },
                        status: { $ne: 'read' }
                    })
                    if (unreadMessages.length > 0) {
                        const updatedMessages = await Message.find({
                            conversationId: validConversationId,
                            status: 'read'
                        });

                        io.in(`conversation:${validConversationId}`).emit('message:status-updated',
                            updatedMessages.map(msg => ({
                                _id: msg._id,
                                conversationId: msg.conversationId,
                                status: 'read',
                                readAt: msg.readAt
                            }))
                        );
                        await Message.updateMany(
                            {
                                _id: { $in: unreadMessages.map(m => new mongoose.Types.ObjectId(m._id)) },
                                status: { $ne: 'read' }
                            },
                            {
                                status: 'read',
                                readAt: new Date()
                            }
                        );
                        await Conversation.findByIdAndUpdate(
                            validConversationId,
                            {
                                $set: { unreadCount: 0 },
                                $currentDate: { updatedAt: true }
                            }
                        );
                    }
                } catch (error) {
                    console.error('Error updating message status:', error);
                }
            });
            socket.on('mark:conversation-read', async (conversationId) => {
                try {
                    await Message.updateMany({
                        conversationId,
                        sender: { $ne: userId },
                        status: { $ne: 'read' }
                    }, {
                        status: 'read',
                        readAt: new Date()
                    })

                    const readMessages = await Message.find({
                        conversationId,
                        status: 'read',
                        sender: { $ne: userId }
                    })

                    readMessages.forEach(message => {
                        io.to(`conversation:${conversationId}`).emit('message:status-updated',
                            readMessages.map(msg => ({
                                _id: msg._id,
                                conversationId: msg.conversationId,
                                status: 'read',
                                readAt: msg.readBy.readAt
                            }))
                        )
                    })
                    await Conversation.findByIdAndUpdate(conversationId, {
                        unreadCount: 0,
                        $currentDate: { updatedAt: true }
                    })
                } catch (error) {
                    console.error('Error in mark conversation read handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });
            socket.on('message:delivered', async (messageId) => {
                try {
                    const message = await Message.findByIdAndUpdate(
                        messageId,
                        {
                            status: 'delivered',
                            deliveredAt: new Date()
                        },
                        { new: true }
                    );

                    // Phát sự kiện đến tất cả clients
                    io.to(`conversation:${message.conversationId}`).emit('message:status-updated', {
                        messageId,
                        status: 'delivered',
                        deliveredAt: message.deliveredAt
                    });
                } catch (error) {
                    console.error('Error updating message status delivered:', error);
                }
            });

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