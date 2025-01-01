// ../backend/socket.js
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const User = require('../models/Users');
const Message = require('../models/Messages');
const Conversation = require('../models/Conservations');
const socketAuth = require('../middlewares/socketAuth');
const Friendships = require('../models/Friendships');
const Notifications = require('../models/Notifications');
const Users = require('../models/Users');
const setUpSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: 'http://localhost:3000',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
        },
    });

    io.use(socketAuth);
    const onlineUsers = new Map();

    io.on("connection", async (socket) => {

        try {
            const userId = socket?.user?._id;
            if (!userId) {
                console.error("Invalid userId in socket connection.");
                socket.disconnect(true);
                return;
            }
            console.log(`User ${userId} connected`);

            socket.join(userId);

            socket.on('getRooms', () => {
                const rooms = Array.from(socket.rooms);
                socket.emit('roomsList', rooms);
            });


            socket.on('joinRoom', (room) => {
                socket.join(room);
            });
            socket.emit('roomsList', Array.from(socket.rooms));

            const connectionCount = (onlineUsers.get(userId) || 0) + 1;
            onlineUsers.set(userId, connectionCount);
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    status: 'online',
                    lastActive: new Date()
                },
                { new: true }
            ).select('_id name avatar status lastActive');
            if (updatedUser) {
                io.emit('user:online', {
                    _id: updatedUser._id,
                    name: updatedUser.name || '',
                    avatar: updatedUser.avatar || '',
                    status: 'online',
                    lastActive: updatedUser.lastActive || new Date()
                })
            }
            socket.on('user:offline', async (userData, callback) => {
                const userId = userData._id;

                const updatedUser = await User.findByIdAndUpdate(
                    userId,
                    {
                        status: 'offline',
                        lastActive: new Date()
                    },
                    { new: true }
                ).select('_id name avatar status lastActive');

                io.emit('user:offline', {
                    _id: updatedUser._id,
                    name: updatedUser.name,
                    avatar: updatedUser.avatar,
                    status: 'offline',
                    lastActive: updatedUser.lastActive
                });

                if (callback) callback();
            });
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
                    const friendship = await Friendships.findOne({
                        $or: [
                            { requester: userId, recipient: receiverId, status: 'accepted' },
                            { requester: receiverId, recipient: userId, status: 'accepted' }
                        ]
                    })
                    if (!friendship) {
                        throw new Error('Friendship not found');
                    }

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
                    [userId, receiverId].forEach(id => {
                        io.to(id).emit('conversation:created', enrichedConversation);
                    });

                } catch (error) {
                    console.error('Error in create conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('create:group-conversation', async (data) => {
                try {
                    if (!data.name || !data.participants || data.participants.length < 2) {
                        throw new Error('Invalid group conversation data');
                    }
                    const conversation = new Conversation({
                        type: 'group',
                        name: data.name,
                        participants: data.participants,
                        creator: userId,
                    })
                    await conversation.save();

                    await conversation.populate({
                        path: 'participants',
                        select: 'name avatar status lastActive'
                    })

                    const enrichedConversation = {
                        _id: conversation._id.toString(),
                        participants: conversation.participants,
                        lastMessage: conversation.lastMessage || null,
                        name: conversation.name,
                        type: 'group',
                    }
                    console.log('Emitted Group Conversation:', enrichedConversation);
                    data.participants.forEach(participantId => {
                        io.to(participantId).emit('conversation:created', enrichedConversation);
                    })
                } catch (error) {
                    console.error('Error in create group conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })

            socket.on('get:conversations', async (userId) => {
                console.log('Received get:conversations request with userId:', userId);
                try {
                    if (!userId) {
                        console.error('UserId is undefined');
                        return socket.emit('error', { message: 'UserId is required' });
                    }
                    const userIdString = userId.toString();

                    const allConversations = await Conversation.find({
                        participants: userIdString
                    })
                    .populate({
                        path: 'participants',
                        select: 'name avatar status lastActive'
                    })
                    .populate({
                        path: 'lastMessage',
                        populate:{
                            path: 'sender',
                            select: 'name avatar status lastActive'
                        }
                    })
                    .lean();

                    const friendships = await Friendships.find({
                        $or: [
                            { requester: userId, status: 'accepted' },
                            { recipient: userId, status: 'accepted' }
                        ]
                    }).lean();

                    const friendIds = friendships.map(friendship => 
                        friendship.requester.toString() === userIdString
                            ? friendship.recipient.toString()
                            : friendship.requester.toString()
                    )

                    const filteredConversations = allConversations.filter(conv =>{
                        if (conv.type === 'group'){
                            return true;
                        }else if (conv.type === 'private'){
                            
                            const otherParticipantId = conv.participants.find(
                                p => p._id.toString() !== userIdString
                            )._id.toString();

                            return friendIds.includes(otherParticipantId);
                        }
                        return false;
                    })


                    const enrichedConversations = filteredConversations.map(conv => {
                        const conversationId = conv._id.toString();

                        const enrichedParticipants = conv.participants.map(p => ({
                            _id: p._id.toString(),
                            name: p.name,
                            avatar: p.avatar,
                            status: p.status,
                            lastActive: p.lastActive
                        }));

                        const enrichedLastMessage = conv.lastMessage ? {
                            _id: conv.lastMessage._id.toString(),
                            content: conv.lastMessage.content,
                            sender: {
                                _id: conv.lastMessage.sender._id.toString(),
                                name: conv.lastMessage.sender.name,
                                avatar: conv.lastMessage.sender.avatar,
                                status: conv.lastMessage.sender.status,
                                lastActive: conv.lastMessage.sender.lastActive
                            },
                            createdAt: conv.lastMessage.createdAt,
                            updatedAt: conv.lastMessage.updatedAt,
                            type: conv.lastMessage.type,
                            isRecalled: conv.lastMessage.isRecalled,
                            recallType: conv.lastMessage.recallType,
                            attachments: conv.lastMessage.attachments || []
                        } : undefined;

                        // Base conversation object với các thuộc tính chung
                        const baseConversation = {
                            _id: conversationId,
                            type: conv.type,
                            lastMessage: enrichedLastMessage,
                            createdAt: conv.createdAt,
                            updatedAt: conv.updatedAt || conv.createdAt,
                            participants: enrichedParticipants
                        };

                        // Thêm các thuộc tính đặc biệt cho từng loại conversation
                        if (conv.type === 'group') {
                            return {
                                ...baseConversation,
                                name: conv.name,
                                avatarGroup: conv.avatarGroup,
                                creator: conv.creator ? conv.creator.toString() : null,
                                admins: conv.admins ? conv.admins.map(id => id.toString()) : []
                            };
                        }

                        // Cho private conversation
                        const otherParticipant = enrichedParticipants.find(p =>
                            p._id.toString() !== userIdString
                        );

                        return {
                            ...baseConversation,
                            otherParticipant: otherParticipant || null
                        };
                    });

                    // Sắp xếp theo thời gian mới nhất
                    const sortedConversations = enrichedConversations.sort((a, b) => {
                        const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
                        const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
                        return new Date(bTime) - new Date(aTime);
                    });

                    socket.emit('conversations:list', sortedConversations);
                } catch (error) {
                    console.error('Error in get conversations handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('update:conversation', async ({ conversationId, lastMessage, type, attachments }) => {
                try {

                    if (!lastMessage || !lastMessage.sender) {
                        throw new Error('Invalid message data');
                    }

                    const existingMessage = await Message.findOne({
                        conversationId,
                        content: lastMessage.content || '',
                        sender: lastMessage.sender._id,
                        sentAt: { $gte: new Date(Date.now() - 5000) } // Kiểm tra trong vòng 5 giây gần đây
                    });

                    if (existingMessage) {
                        console.log('Message already exists, skipping duplicate');
                        return;
                    }
                    const newMessage = new Message({
                        conversationId,
                        sender: lastMessage.sender._id,
                        content: lastMessage.content || '',
                        type: type,
                        attachments: attachments ? attachments.map(file => ({
                            fileName: file.fileName,
                            fileUrl: file.fileUrl,
                            fileType: file.fileType,
                            fileSize: file.fileSize
                        })) : [],
                        sentAt: new Date(),
                        tempId: lastMessage.tempId,
                    })
                    await newMessage.save();

                    await newMessage.populate('sender', 'name avatar');

                    const updatedConversation = await Conversation.findByIdAndUpdate(
                        conversationId,
                        {
                            lastMessage: newMessage._id,
                            updatedAt: new Date()
                        },
                        { new: true }
                    ).populate({
                        path: 'lastMessage',
                        populate: {
                            path: 'sender',
                            select: 'name avatar'
                        }
                    }).lean();

                    io.to(`conversation:${conversationId}`).emit('conversation:updated', {
                        _id: updatedConversation._id,
                        lastMessage: newMessage,
                        type: type,
                        attachments: attachments
                    })

                    if (attachments && attachments.length > 0) {
                        attachments.forEach(file => {
                            io.to(`conversation:${conversationId}`).emit('files:added', {
                                ...file,
                                conversationId: conversationId,
                                sender: newMessage.sender
                            });
                        })
                    }
                } catch (error) {
                    console.log('Error in update conversation handler:', error);
                }
            })

            socket.on('files:added', async (fileData) => {
                try {
                  // Broadcast the new file to all clients in the conversation
                  io.to(`conversation:${fileData.conversationId}`).emit('files:added', {
                    ...fileData,
                    sender: {
                      _id: fileData.sender._id,
                      name: fileData.sender.name,
                      avatar: fileData.sender.avatar
                    }
                  });
                } catch (error) {
                  console.error('Error handling files:added event:', error);
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
            socket.on('send:message', async ({ conversationId, content, type, attachments, tempId, sender, createdAt, replyTo }, callback) => {
                try {
                    const existingMessage = await Message.findOne({ tempId });
                    if (existingMessage) {
                        if (callback) {
                            callback(null, existingMessage);
                        }
                        return;
                    }
                    if (!conversationId || (!content && (!attachments || attachments.length === 0))) {
                        throw new Error('Invalid message data');
                    }
                    const conversation = await Conversation.findById(conversationId).populate('participants');
                    const recipientId = conversation.participants.find(p => p._id.toString() !== userId.toString())?._id;

                    const recipientSocketInRoom = await io.in(`conversation:${conversationId}`).fetchSockets();
                    const isRecipientInRoom = recipientSocketInRoom.some(
                        s => s.user?._id?.toString() === recipientId?.toString()
                    )


                    const message = new Message({
                        conversationId,
                        sender: userId,
                        content: content || '',
                        type,
                        replyTo: replyTo || null,
                        attachments: attachments ? attachments.map(file => ({
                            fileName: file.fileName,
                            fileUrl: file.fileUrl,
                            fileType: file.fileType,
                            mimeType: file.mimeType,
                            fileSize: file.fileSize
                        })) : [],
                        status: isRecipientInRoom ? 'read' : (onlineUsers.has(recipientId) ? 'delivered' : 'sent'),
                        sentAt: createdAt || new Date(),
                        tempId,
                        readBy: isRecipientInRoom ? {
                            user: recipientId,
                            readAt: new Date()
                        } : null
                    })
                    await message.save();

                    await message.populate([
                        { path: 'sender', select: 'name avatar _id' },
                        { path: 'reactions.user', select: 'name avatar _id' },
                        { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name avatar' } }
                    ]);
                    io.to(`conversation:${conversationId}`).emit('new:message', message);

                    if (replyTo) {
                        io.to(`conversation:${conversationId}`).emit('message:reply', message);
                    }
                    const updatedConversations = await Conversation.findByIdAndUpdate(
                        conversationId,
                        {
                            lastMessage: message._id,
                            updatedAt: new Date()
                        },
                        {
                            new: true
                        }
                    ).populate({
                        path: 'lastMessage',
                        populate: {
                            path: 'sender',
                            select: 'name avatar _id'
                        }
                    }).lean();

                    const formattedConversation = {
                        _id: updatedConversations._id,
                        type: updatedConversations.type,
                        createdAt: updatedConversations.createdAt,
                        updatedAt: new Date(),
                        lastMessage: {
                            _id: message._id,
                            content: message.content,
                            type: message.type,
                            sender: {
                                _id: sender._id,
                                name: sender.name,
                                avatar: sender.avatar
                            },
                            conversationId: conversationId,
                            createdAt: message.createdAt || message.sentAt,
                            attachments: message.attachments,
                        }
                    }
                    if (updatedConversations.type === 'private') {
                        const otherParticipant = updatedConversations.participants.find(
                            p => p._id.toString() !== sender._id.toString()
                        );
                        formattedConversation.otherParticipant = {
                            _id: otherParticipant._id,
                            name: otherParticipant.name,
                            avatar: otherParticipant.avatar,
                            status: otherParticipant.status,
                            lastActive: otherParticipant.lastActive
                        };
                    }

                    io.to(`conversation:${conversationId}`).emit('new:message', message);
                    io.to(`conversation:${conversationId}`).emit('conversation:updated', formattedConversation);
                    if (callback) {
                        callback(null, message);
                    }
                    console.log('Message sent:', message);
                } catch (error) {
                    console.error('Error in send message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('message:react', async ({ messageId, emoji }) => {
                try {
                    const message = await Message.findById(messageId);
                    if (!message) {
                        throw new Error('Message not found');
                    }

                    await Message.updateOne(
                        { _id: messageId },
                        {
                            $pull: {
                                reactions: {
                                    user: userId,
                                    emoji: emoji
                                }
                            }
                        }
                    )

                    if (emoji) {
                        await Message.updateOne(
                            { _id: messageId },
                            {
                                $push: {
                                    reactions: {
                                        emoji,
                                        user: userId,
                                        createdAt: new Date()
                                    }
                                }
                            }
                        )
                    }

                    const updatedMessage = await Message.findById(messageId)
                        .populate({
                            path: 'reactions.user',
                            select: '_id name avatar'
                        });

                    io.to(`conversation:${message.conversationId}`).emit('message:reaction-updated', {
                        messageId,
                        reactions: updatedMessage.reactions
                    });
                    console.log('Reaction added:', updatedMessage.reactions);
                } catch (error) {
                    console.error('Error in message react handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('message:remove-reaction', async ({ messageId, emoji }) => {
                try {
                    const message = await Message.findById(messageId);
                    if (!message) {
                        throw new Error('Message not found');
                    }
                    await Message.updateOne(
                        { _id: messageId },
                        {
                            $pull: {
                                reactions: {
                                    user: userId,
                                    emoji: emoji
                                }
                            }
                        }
                    )
                    const updatedMessage = await Message.findById(messageId)
                        .populate({
                            path: 'reactions.user',
                            select: '_id name avatar'
                        });

                    io.to(`conversation:${message.conversationId}`).emit('message:reaction-updated', {
                        messageId,
                        reactions: updatedMessage.reactions
                    })
                    console.log('Reaction removed:', updatedMessage.reactions);
                } catch (error) {
                    console.error('Error in remove reaction handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('message:recall', async ({ messageId, recallType, conversationId, sender, content }) => {
                try {

                    const message = await Message.findOne({
                        _id: messageId,
                        sender: userId
                    }).populate({
                        path: 'sender',
                        select: 'name avatar status lastActive' // Thêm status và lastActive
                    });

                    if (!message) {
                        throw new Error('Message not found');
                    }

                    const updateData = {
                        isRecalled: true,
                        recallType,
                        recalledAt: new Date(),
                        content: recallType === 'self' ? content : '',
                        attachments: message.attachments,
                        status: 'delivered'
                    }

                    const updateMessage = await Message.findByIdAndUpdate(
                        messageId,
                        updateData,
                        { new: true }
                    ).populate({
                        path: 'sender',
                        select: 'name avatar status lastActive'  // Thêm status và lastActive
                    });

                    io.to(`conversation:${conversationId}`).emit('message:recalled', {
                        messageId,
                        recallType,
                        message: updateMessage,
                        sender: {
                            _id: sender._id,
                            name: sender.name,
                            avatar: sender.avatar,
                            status: sender.status,
                            lastActive: sender.lastActive
                        },
                        originalContent: content
                    });

                    const conversation = await Conversation.findById(conversationId);
                    if (conversation.lastMessage.toString() === messageId) {

                        // const updatedConversation = await Conversation.findByIdAndUpdate(
                        //     conversationId,
                        //     {
                        //         lastMessage: previousMessage?._id || message._id,
                        //         updatedAt: new Date()
                        //     },
                        //     { new: true }
                        // ).populate({
                        //     path: 'lastMessage',
                        //     populate: {
                        //         path: 'sender',
                        //         select: 'name avatar status lastActive'
                        //     }
                        // });
                        io.to(`conversation:${conversationId}`).emit('conversation:updated', {
                            _id: conversationId,
                            lastMessage: {
                                ...updateMessage.toObject(),
                                content: recallType === 'everyone'
                                    ? (sender._id === userId ? 'You have recalled a message' : `${sender.name} has recalled a message`)
                                    : (recallType === 'self' && sender._id === userId)
                                        ? 'You have recalled a message'
                                        : content,
                                sender: {
                                    _id: sender._id,
                                    name: sender.name,
                                    avatar: sender.avatar,
                                    status: sender.status,
                                    lastActive: sender.lastActive
                                }
                            },
                            updatedAt: new Date()
                        });
                    }
                } catch (error) {
                    console.error('Error in recall message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })
            socket.on('delete:message', async (messageId) => {
                try {
                    const message = await Message({
                        _id: messageId,
                        sender: userId
                    });
                    if (!message) {
                        throw new Error('Message not found');
                    }
                    await message.remove();
                    io.emit('message:deleted', messageId);
                } catch (error) {
                    console.error('Error in delete message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });
            socket.on('get:messages', async (conversationId, callback) => {
                try {
                    const messages = await Message.find({ conversationId })
                        .populate(
                            [
                                {
                                    path: 'sender',
                                    select: 'name avatar'
                                },
                                {
                                    path: 'reactions.user',
                                    select: '_id name avatar'
                                }
                            ]
                        )
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

            socket.on('get:members', async (conversationId, callback) => {
                try {
                    const conversation = await Conversation.findById(conversationId)
                        .populate('participants', 'name avatar status lastActive');
                    if (!conversation) {
                        throw new Error('Conversation not found');
                    }
                    if (callback) {
                        callback(conversation.participants);
                    } else {
                        socket.emit('members:list', conversation.participants);
                    }
                } catch (error) {
                    console.error('Error in get members handler:', error);
                }
            });

            socket.on('get:files', async (conversationId, callback) => {
                try {
                    const files = await Message.find({
                        conversationId,
                        attachments: { $exists: true, $ne: [] }
                    })
                        .select('attachments sender')
                        .populate('sender', 'name avatar')
                        .lean();

                    const allFiles = files.flatMap(msg =>
                        msg.attachments.map(file => ({
                            ...file,
                            sender: {
                                _id: msg.sender._id,
                                name: msg.sender.name,
                                avatar: msg.sender.avatar
                            },
                            messageId: msg._id
                        }))
                    )
                    if (callback) {
                        callback(allFiles);
                    } else {
                        socket.emit('files:list', allFiles);
                    }
                } catch (error) {
                    console.error('Error in get files handler:', error);
                }
            })
            socket.on('sendFriendRequest', async (data) => {
                const { requesterId, recipientId } = data;

                try {
                    if (!requesterId || !recipientId) {
                        return socket.emit('friendRequestError', {
                            message: 'Invalid friend request data'
                        })
                    }
                    const requesterUser = await Users.findById(requesterId);
                    const recipientUser = await Users.findById(recipientId);

                    if (!requesterUser || !recipientUser) {
                        return socket.emit('friendRequestError', {
                            message: 'User not found'
                        });
                    }

                    const existingRequest = await Friendships.findOne({
                        requester: requesterId,
                        recipient: recipientId,
                        status: 'pending'
                    });

                    if (existingRequest) {
                        return socket.emit('friendRequestError', {
                            message: 'Friend request already sent'
                        })
                    }

                    const friendshipRequest = new Friendships({
                        requester: requesterId,
                        recipient: recipientId,
                        status: 'pending'
                    })
                    await friendshipRequest.save();

                    const notification = new Notifications({
                        userId: recipientId,
                        type: 'friend_request',
                        referenceId: friendshipRequest._id,
                        content: `${requesterUser.name} sent you a friend request`,
                        isRead: false,
                        sender: {
                            _id: requesterId,
                            name: requesterUser.name,
                            avatar: requesterUser.avatar
                        }
                    })
                    await notification.save();

                    // Broadcast to all sockets of the recipient
                    io.sockets.sockets.forEach((socket) => {
                        if (socket.user?._id?.toString() === recipientId) {
                            socket.emit('newFriendRequest', {
                                notification: notification.toObject(),
                            });
                        }
                    });

                    // Send confirmation to the sender
                    socket.emit('friendRequestSent', {
                        notification: notification.toObject(),
                    });

                } catch (error) {
                    socket.emit('friendRequestError', {
                        message: 'Error sending friend request'
                    })
                }
            })

            socket.on('respondToFriendRequest', async (data) => {
                const { requestId, status, userId } = data;

                try {
                    if (!requestId || !status || !userId) {
                        return socket.emit('friendRequestError', {
                            message: 'Invalid request parameters'
                        });
                    }

                    const friendship = await Friendships.findByIdAndUpdate(
                        requestId,
                        { status },
                        { new: true }
                    ).populate('requester recipient');

                    if (!friendship) {
                        return socket.emit('friendRequestError', {
                            message: 'Friend request not found'
                        });
                    }
                    await Notifications.findOneAndUpdate(
                        {
                            referenceId: requestId,
                            type: 'friend_request',
                            userId: userId
                        },
                        {
                            type: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_rejected',
                            content: status === 'accepted'
                                ? `Bạn đã chấp nhận lời mời kết bạn từ ${friendship.requester.name}`
                                : `Bạn đã từ chối lời mời kết bạn từ ${friendship.requester.name}`,
                            isRead: true
                        }
                    );
                    const requesterNotification = new Notifications({
                        userId: friendship.requester._id,
                        type: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_rejected',
                        referenceId: requestId,
                        content: status === 'accepted'
                            ? `${friendship.recipient.name} đã chấp nhận lời mời kết bạn của bạn`
                            : `${friendship.recipient.name} đã từ chối lời mời kết bạn của bạn`,
                        isRead: false,
                        sender: {
                            _id: userId,
                            name: socket.user?.name,
                            avatar: socket.user?.avatar
                        }
                    });
                    await requesterNotification.save();

                    if (status === 'accepted') {
                        const conversation = new Conversation({
                            type: 'private',
                            participants: [friendship.requester._id, friendship.recipient._id],
                            creator: userId,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        })
                        await conversation.save();

                        await conversation.populate({
                            path: 'participants',
                            select: 'name avatar status lastActive'
                        });

                        const enrichedConversation = {
                            _id: conversation._id.toString(),
                            type: 'private',
                            participants: conversation.participants,
                            lastMessage: null,
                            updatedAt: new Date(),
                            otherParticipant: conversation.participants.find(
                                p => p._id.toString() !== userId.toString()
                            )
                        }
                        [friendship.requester._id, friendship.recipient._id].forEach(id => {
                            io.to(id.toString()).emit('conversation:created', {
                                conversation: enrichedConversation,
                                isRecipient: id.toString() === friendship.recipient._id.toString()
                            });
                        });
                        io.to(friendship.requester._id.toString()).emit('friendRequestAccepted', {
                            type: 'friend_request_accepted',
                            notification: requesterNotification,
                            conversation: enrichedConversation,
                            recipient: friendship.recipient._id,
                            requester: friendship.requester._id
                        });

                        io.to(friendship.recipient._id.toString()).emit('friendRequestAccepted', {
                            type: 'friend_request_accepted',
                            conversation: enrichedConversation,
                            recipient: friendship.recipient._id,
                            requester: friendship.requester._id
                        });

                    } else if (status === 'rejected') {
                        io.to(friendship.requester._id.toString()).emit('friendRequestRejected', {
                            type: 'friend_request_rejected',
                            notification: requesterNotification
                        });
                    }
                } catch (error) {
                    socket.emit('friendRequestError', {
                        message: 'Error responding to friend request'
                    })
                }
            })

            socket.on('markNotificationsAsRead', async (data) => {
                const { userId, notificationIds } = data;
                try {
                    const updateNotifications = await Notifications.updateMany(
                        {
                            _id: { $in: notificationIds },
                            userId: userId
                        },
                        { $set: { isRead: true } }
                    );
                    socket.emit('notificationsMarkedAsRead', {
                        success: true,
                        notificationIds: notificationIds
                    })
                } catch (error) {
                    console.error('Error marking notifications as read', error);
                    socket.emit('notificationsMarkedAsRead', {
                        success: false,
                        error: 'Failed to mark notifications as read'
                    });
                }
            });

            socket.on('disconnect', async () => {
                try {
                    const newCount = (onlineUsers.get(userId) || 0) - 1;

                    if (newCount <= 0) {
                        // Cập nhật trạng thái offline khi không còn connection nào
                        await User.findByIdAndUpdate(
                            userId,
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