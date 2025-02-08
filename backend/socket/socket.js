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
            // console.log(`User ${userId} connected`);

            socket.join(`user:${userId}`);

            const userConversations = await Conversation.find({
                participants: userId
            }).select('_id');

            const conversationRooms = userConversations.map(
                conv => `conversation:${conv._id}`
            )
            await socket.join(conversationRooms);

            socket.on('getRooms', () => {
                const rooms = Array.from(socket.rooms);
                socket.emit('roomsList', rooms);
            });


            socket.on('joinRoom', (room) => {
                if (typeof room === 'string' && room.trim()) {
                    socket.join(room);
                    socket.emit('roomsList', Array.from(socket.rooms));
                }
            });

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

            socket.on('create:conversation', async ({ receiverId, userId, content }, callback) => {
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
                            isFriendshipPending: true,
                            friendRequestStatus: 'none',
                            createdAt: new Date()
                        });
                        await conversation.save();
                        await conversation.populate({
                            path: 'participants',
                            select: 'name avatar status lastActive'
                        })

                        conversation.participants.forEach(participant => {
                            io.to(participant._id.toString()).emit('conversation:created', conversation);
                        });
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

                        const updatedConversation = await conversation.populate({
                            path: 'lastMessage',
                            populate: {
                                path: 'sender',
                                select: 'name avatar status lastActive'
                            }
                        })
                        // io.sockets.sockets.forEach((socket) => {
                        //     if (socket.user?._id?.toString() === friendship.requester._id.toString()) {
                        //         socket.emit('friendRequestResponded', {
                        //             type: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_rejected',
                        //             notification: requesterNotification.toObject()
                        //         });
                        //     }
                        // });


                        // [userId, receiverId].forEach(id => {
                        //     io.to(id).emit('conversation:updated', updatedConversation);
                        // });

                        io.sockets.sockets.forEach((socket) => {
                            if (socket.user?._id?.toString() === userId.toString() || socket.user?._id?.toString() === receiverId.toString()) {
                                socket.emit('conversation:updated', updatedConversation);
                            }
                        });
                    }

                    await conversation.populate({
                        path: 'participants',
                        select: 'name avatar status lastActive'
                    })

                    const enrichedConversation = {
                        _id: conversation._id.toString(),
                        type: 'private',
                        participants: conversation.participants,
                        lastMessage: conversation.lastMessage || null,
                        otherParticipant: conversation.participants.find(p => p._id.toString() !== userId.toString()),
                        isFriendshipPending: conversation.isFriendshipPending || false,
                        friendRequestStatus: conversation.friendRequestStatus || 'none',
                        createdAt: conversation.createdAt || new Date(),
                    }
                    console.log('Emitted Conversation:', enrichedConversation);

                    [userId, receiverId].forEach(id => {
                        io.to(id).emit('conversation:created', enrichedConversation);
                    });
                    callback(enrichedConversation);
                } catch (error) {
                    console.error('Error in create conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('create:group-conversation', async (data, callback) => {
                try {
                    if (!data.name || !data.participants || data.participants.length < 2) {
                        throw new Error('Invalid group conversation data');
                    }
                    const conversation = new Conversation({
                        type: 'group',
                        name: data.name,
                        participants: data.participants,
                        creator: userId,
                        avatarGroup: data.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png'
                    })
                    await conversation.save();

                    await conversation.populate([
                        {
                            path: 'participants',
                            select: 'name avatar status lastActive'
                        },
                        {
                            path: 'lastMessage',
                            populate: {
                                path: 'sender',
                                select: 'name avatar status lastActive'
                            }
                        }
                    ]);

                    const enrichedConversation = {
                        _id: conversation._id.toString(),
                        participants: conversation.participants,
                        lastMessage: null,
                        name: conversation.name,
                        type: 'group',
                        creator: userId,
                        createdAt: conversation.createdAt,
                        updatedAt: conversation.updatedAt,
                        avatarGroup: conversation.avatarGroup || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png'
                    }

                    if (callback) {
                        callback({ conversation: enrichedConversation });
                    }
                    console.log('Emitted Group Conversation:', enrichedConversation);
                    data.participants.forEach(participantId => {
                        if (participantId !== userId) {
                            io.to(participantId).emit('conversation:created', enrichedConversation);
                        }
                    })
                } catch (error) {
                    console.error('Error in create group conversation handler:', error);
                    if (callback) {
                        callback({ error: error.message });
                    } else {
                        socket.emit('error', { message: error.message });
                    }
                }
            })

            socket.on('group:updated', async ({ groupId, name, avatarGroup }) => {
                try {

                    const updatedGroup = await Conversation.findByIdAndUpdate(
                        groupId,
                        { $set: { name, avatarGroup, updatedAt: new Date() } },
                        { new: true }
                    ).populate(
                        'participants', 'name avatar status lastActive'
                    ).populate({
                        path: 'lastMessage',
                        populate: {
                            path: 'sender',
                            select: 'name avatar status lastActive'
                        }
                    });

                    const enrichedLastMessage = updatedGroup.lastMessage ? {
                        _id: updatedGroup.lastMessage._id,
                        content: updatedGroup.lastMessage.content,
                        createdAt: updatedGroup.lastMessage.createdAt,
                        updatedAt: updatedGroup.lastMessage.updatedAt,
                        type: updatedGroup.lastMessage.type,
                        sender: {
                            _id: updatedGroup.lastMessage.sender._id,
                            name: updatedGroup.lastMessage.sender.name,
                            avatar: updatedGroup.lastMessage.sender.avatar,
                            status: updatedGroup.lastMessage.sender.status
                        },
                        readBy: updatedGroup.lastMessage.readBy || []
                    } : null;

                    const updateEvent = {
                        _id: updatedGroup._id,
                        name: updatedGroup.name,
                        avatarGroup: updatedGroup.avatarGroup,
                        participants: updatedGroup.participants,
                        lastMessage: enrichedLastMessage,
                        type: 'group',
                        updatedAt: new Date()
                    };
                    if (updatedGroup.lastMessage) {
                        updateEvent.lastMessage = updatedGroup.lastMessage;
                    }

                    io.sockets.sockets.forEach((socket) => {
                        if (updatedGroup.participants.some(p => p._id.toString() === socket.user?._id?.toString())) {
                            socket.emit('group:updated', updateEvent);
                        }
                    });
                } catch (error) {
                    console.error('Error in update group handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('group:addMembers', async ({ groupId, memberId }) => {
                try {
                    const addedMember = await User.findById(memberId, 'name');
                    const addedByUser = socket.user;

                    const updatedGroup = await Conversation.findByIdAndUpdate(
                        groupId,
                        {
                            $addToSet: {
                                participants: memberId
                            },
                            $set: { updatedAt: new Date() }
                        },
                        { new: true }
                    ).populate('participants', 'name avatar status lastActive');

                    const personalizedContent = updatedGroup.participants.map(p => ({
                        userId: p._id,
                        content: p._id.toString() === addedByUser._id.toString()
                            ? `You added ${addedMember.name} to the group`
                            : p._id.toString() === memberId
                                ? `You were added to the group by ${addedByUser.name}`
                                : `${addedByUser.name} added ${addedMember.name} to the group`
                    }))

                    const systemMessage = await Message.create({
                        conversationId: groupId,
                        sender: addedByUser._id,
                        content: `${addedByUser.name} added ${addedMember.name} to the group`,
                        type: 'system',
                        isSystemMessage: true,
                        metadata: {
                            addedUserId: memberId,
                            addedUserName: addedMember.name,
                            addedByUserId: addedByUser._id,
                            addedByUserName: addedByUser.name
                        },
                        personalizedContent,
                        createdAt: new Date(),
                    });

                    await Conversation.findByIdAndUpdate(
                        groupId,
                        { lastMessage: systemMessage._id }
                    )

                    const populatedMessage = await Message.findById(systemMessage._id)
                        .populate('sender', 'name avatar status lastActive');

                    updatedGroup.participants.forEach(participant => {
                        const participantId = participant._id.toString();
                        const personalizedMsg = personalizedContent.find(p => p.userId.toString() === participantId);

                        const messageForParticipant = {
                            ...populatedMessage.toObject(),
                            content: personalizedMsg?.content || populatedMessage.content
                        };

                        const updateEvent = {
                            ...updatedGroup.toObject(),
                            lastMessage: {
                                ...messageForParticipant,
                                sender: {
                                    _id: addedByUser._id,
                                    name: addedByUser.name,
                                    avatar: addedByUser.avatar,
                                    status: addedByUser.status
                                }
                            }
                        }

                        io.sockets.sockets.forEach((socket) => {
                            if (socket.user?._id.toString() === participantId) {
                                socket.emit('group:updated', updateEvent);
                                socket.emit('new:message', messageForParticipant);

                                if (participantId === memberId) {
                                    socket.emit('group:added', updateEvent);
                                }
                            }
                        });
                    });
                } catch (error) {
                    console.error('Error in add members to group handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });
            socket.on('group:removeMember', async ({ groupId, memberId }) => {
                try {
                    const removedMember = await User.findById(memberId, 'name');
                    const removedByUser = socket.user;

                    const updatedGroup = await Conversation.findByIdAndUpdate(
                        groupId,
                        {
                            $pull: { participants: memberId },
                            $set: { updatedAt: new Date() }
                        },
                        { new: true }
                    ).populate('participants', 'name avatar status lastActive');

                    const personalizedContent = updatedGroup.participants.map(p => ({
                        userId: p._id,
                        content: p._id.toString() === removedByUser._id.toString()
                            ? `You removed ${removedMember.name} from the group`
                            : `${removedByUser.name} removed ${removedMember.name} from the group`
                    }))

                    const systemMessage = await Message.create({
                        conversationId: groupId,
                        sender: removedByUser._id,
                        content: `${removedByUser.name} removed ${removedMember.name} from the group`,
                        type: 'system',
                        isSystemMessage: true,
                        metadata: {
                            removedUserId: memberId,
                            removedUserName: removedMember.name,
                            removedByUserId: removedByUser._id,
                            removedByUserName: removedByUser.name
                        },
                        personalizedContent,
                        createdAt: new Date(),
                    });

                    await Conversation.findByIdAndUpdate(groupId, {
                        lastMessage: systemMessage._id
                    });

                    const populatedMessage = await Message.findById(systemMessage._id)
                        .populate('sender', 'name avatar status lastActive');

                    const userSocket = Array.from(io.sockets.sockets.values()).find(
                        socket => socket.user?._id.toString() === memberId
                    );

                    if (userSocket) {
                        userSocket.emit('group:removed', groupId);
                    }

                    updatedGroup.participants.forEach(participant => {
                        const participantId = participant._id.toString();
                        const personalizedMsg = personalizedContent.find(p => p.userId.toString() === participantId);


                        const messageForParticipant = {
                            ...populatedMessage.toObject(),
                            content: personalizedMsg?.content || populatedMessage.content
                        };

                        const updateEvent = {
                            ...updatedGroup.toObject(),
                            lastMessage: {
                                ...messageForParticipant,
                                sender: {
                                    _id: removedByUser._id,
                                    name: removedByUser.name,
                                    avatar: removedByUser.avatar,
                                    status: removedByUser.status
                                }
                            }
                        }

                        io.sockets.sockets.forEach((socket) => {
                            if (updatedGroup.participants.some(p => p._id.toString() === socket.user?._id?.toString())) {
                                socket.emit('group:updated', updateEvent);
                                socket.emit('new:message', messageForParticipant);
                            }
                        });
                    });

                } catch (error) {
                    console.error('Error in remove member from group handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('group:leave', async ({ groupId, userId }) => {
                try {
                    const leavingUser = await User.findById(userId, 'name');
                    const conversation = await Conversation.findByIdAndUpdate(
                        groupId,
                        { $pull: { participants: userId } },
                        { new: true }
                    ).populate('participants', 'name avatar status lastActive');

                    if (conversation.creator.toString() === userId) {
                        const newCreator = conversation.participants[0]?._id;
                        if (newCreator) {
                            conversation.creator = newCreator;
                            await conversation.save();
                        }
                    }

                    const systemMessage = await Message.create({
                        conversationId: groupId,
                        sender: userId,
                        type: 'system',
                        isSystemMessage: true,
                        content: `${leavingUser.name} left the group`,
                        createdAt: new Date()
                    })

                    io.sockets.sockets.forEach((socket) => {
                        if (conversation.participants.some(p => p._id.toString() === socket.user?._id?.toString())) {
                            socket.emit('group:updated', conversation);
                            socket.emit('new:message', {
                                ...systemMessage.toObject(),
                            });
                        }
                    });

                    // conversation.participants.forEach(participant => {
                    //     io.to(participant._id.toString()).emit('new:message', {
                    //         ...systemMessage.toObject(),
                    //         content: `${leavingUser.name} left the group`
                    //     });
                    //     io.to(participant._id.toString()).emit('group:updated', conversation);
                    // })

                    const userSocket = Array.from(io.sockets.sockets.values()).find(
                        socket => socket.user?._id.toString() === userId
                    );

                    if (userSocket) {
                        userSocket.emit('group:left', groupId);
                    }
                } catch (error) {
                    console.error('Error in leave group handler:', error);
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

                    // Fetch friendships in parallel with conversations
                    const [allConversations, friendships] = await Promise.all([
                        Conversation.find({
                            participants: userIdString
                        })
                            .populate({
                                path: 'participants',
                                select: 'name avatar status lastActive'
                            })
                            .populate({
                                path: 'lastMessage',
                                populate: [{
                                    path: 'sender',
                                    select: 'name avatar status lastActive'
                                }],
                                select: 'content sender createdAt updatedAt type isRecalled recallType attachments personalizedContent readBy'
                            })
                            .sort({ updatedAt: -1 })
                            .lean(),

                        Friendships.find({
                            $or: [
                                { requester: userId, status: 'accepted' },
                                { recipient: userId, status: 'accepted' }
                            ]
                        }).lean()
                    ]);

                    // Process friendships once
                    const friendIds = new Set(friendships.map(friendship =>
                        friendship.requester.toString() === userIdString
                            ? friendship.recipient.toString()
                            : friendship.requester.toString()
                    ));

                    // Helper function to get personalized message content
                    const getPersonalizedContent = (message) => {
                        if (!message) return undefined;

                        const personalizedMsg = message.personalizedContent?.find(
                            pc => pc.userId.toString() === userIdString
                        );
                        return personalizedMsg?.content || message.content;
                    };

                    // Helper function to enrich participants
                    const enrichParticipant = (p) => ({
                        _id: p._id.toString(),
                        name: p.name,
                        avatar: p.avatar,
                        status: p.status,
                        lastActive: p.lastActive
                    });

                    // Helper function to enrich last message
                    const enrichLastMessage = (message) => {
                        if (!message) return undefined;

                        return {
                            _id: message._id.toString(),
                            content: getPersonalizedContent(message),
                            sender: message.sender ? {
                                _id: message.sender._id.toString(),
                                name: message.sender.name,
                                avatar: message.sender.avatar,
                                status: message.sender.status,
                                lastActive: message.sender.lastActive
                            } : null,
                            createdAt: message.createdAt,
                            updatedAt: message.updatedAt,
                            type: message.type,
                            isRecalled: message.isRecalled,
                            recallType: message.recallType,
                            attachments: message.attachments || [],
                            readBy: message.readBy || []
                        };
                    };

                    const enrichedConversations = allConversations
                        // Filter conversations
                        .filter(conv => {
                            if (conv.type === 'group') return true;

                            const otherParticipantId = conv.participants.find(
                                p => p._id.toString() !== userIdString
                            )?._id.toString();

                            return friendIds.has(otherParticipantId) ||
                                conv.isFriendshipPending ||
                                conv.participants.length === 2;
                        })
                        // Map to enriched format
                        .map(conv => {
                            const conversationId = conv._id.toString();
                            const enrichedParticipants = conv.participants.map(enrichParticipant);
                            const enrichedLastMessage = enrichLastMessage(conv.lastMessage);

                            const baseConversation = {
                                _id: conversationId,
                                type: conv.type,
                                lastMessage: enrichedLastMessage,
                                createdAt: conv.createdAt,
                                updatedAt: conv.updatedAt || conv.createdAt,
                                participants: enrichedParticipants,
                                unreadCount: conv.type === 'group'
                                    ? (conv.participantUnreadCount?.[userIdString] || 0)
                                    : (conv.unreadCount || 0),
                                isFriendshipPending: conv.isFriendshipPending || false,
                                friendRequestStatus: conv.friendRequestStatus || 'none'
                            };

                            if (conv.type === 'group') {
                                return {
                                    ...baseConversation,
                                    participantUnreadCount: conv.participantUnreadCount || {},
                                    name: conv.name,
                                    avatarGroup: conv.avatarGroup,
                                    creator: conv.creator?.toString() || null
                                };
                            }

                            const otherParticipant = enrichedParticipants.find(
                                p => p._id !== userIdString
                            );

                            return {
                                ...baseConversation,
                                otherParticipant: otherParticipant || null
                            };
                        })
                        // Sort by latest activity
                        .sort((a, b) => {
                            const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
                            const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
                            return new Date(bTime) - new Date(aTime);
                        });

                    socket.emit('conversations:list', enrichedConversations);
                } catch (error) {
                    console.error('Error in get conversations handler:', error.stack);
                    socket.emit('error', { message: error.message });
                }
            });

            // socket.on('get:conversations', async (userId) => {
            //     console.log('Received get:conversations request with userId:', userId);
            //     try {
            //         if (!userId) {
            //             console.error('UserId is undefined');
            //             return socket.emit('error', { message: 'UserId is required' });
            //         }
            //         const userIdString = userId.toString();

            //         const [allConversations, friendships] = await Promise.all([
            //             Conversation.find({
            //                 participants: userIdString
            //             }).populate({
            //                 path: 'participants',	
            //                 select: 'name avatar status lastActive'
            //             }).populate({
            //                 path: 'lastMessage',
            //                 populate: [{
            //                     path: 'sender',
            //                     select: 'name avatar status lastActive'
            //                 }],
            //                 select: 'content sender createdAt updatedAt type isRecalled recallType attachments personalizedContent readBy'
            //             })
            //             .sort({ updatedAt: -1 })
            //             .lean(),
            //             Friendships.find({
            //                 $or: [
            //                     { requester: userId, status: 'accepted' },
            //                     { recipient: userId, status: 'accepted' }
            //                 ]
            //             }).lean()
            //         ])

            //         // const allConversations = await Conversation.find({
            //         //     participants: userIdString
            //         // })
            //         //     .populate({
            //         //         path: 'participants',
            //         //         select: 'name avatar status lastActive'
            //         //     })
            //         //     .populate({
            //         //         path: 'lastMessage',
            //         //         populate: {
            //         //             path: 'sender',
            //         //             select: 'name avatar status lastActive'
            //         //         }
            //         //     })
            //         //     .sort({ updatedAt: -1 })
            //         //     .lean();

            //         // const friendships = await Friendships.find({
            //         //     $or: [
            //         //         { requester: userId, status: 'accepted' },
            //         //         { recipient: userId, status: 'accepted' }
            //         //     ]
            //         // }).lean();

            //         const friendIds = new Set(friendships.map(friendship =>
            //             friendship.requester.toString() === userIdString
            //                 ? friendship.recipient.toString()
            //                 : friendship.requester.toString()
            //         ))

            //         const getPersonalizedContent = (message) => {
            //             if (!message) {
            //                 return null;
            //             }

            //             const personalizedMsg = message.personalizedContent?.find(
            //                 pc => pc.userId.toString() === userIdString
            //             );
            //             return personalizedMsg?.content || message.content;
            //         };

            //         const filteredConversations = allConversations.filter(conv => {
            //             if (conv.type === 'group') {
            //                 return true;
            //             } else if (conv.type === 'private') {
            //                 const otherParticipantId = conv.participants.find(
            //                     p => p._id.toString() !== userIdString
            //                 )._id.toString();

            //                 return friendIds.includes(otherParticipantId) || conv.isFriendshipPending || conv.participants.length === 2;
            //             }
            //             return false;
            //         })


            //         const enrichedConversations = filteredConversations.map(conv => {
            //             const conversationId = conv._id.toString();
            //             const unreadCount = conv.type === 'group'
            //                 ? (conv.participantUnreadCount?.[userIdString] || 0)
            //                 : conv.unreadCount || 0;

            //             const enrichedParticipants = conv.participants.map(p => ({
            //                 _id: p._id.toString(),
            //                 name: p.name,
            //                 avatar: p.avatar,
            //                 status: p.status,
            //                 lastActive: p.lastActive
            //             }));

            //             const enrichedLastMessage = conv.lastMessage ? {
            //                 _id: conv.lastMessage._id.toString(),
            //                 content: conv.lastMessage.content,
            //                 sender: {
            //                     _id: conv.lastMessage.sender._id.toString(),
            //                     name: conv.lastMessage.sender.name,
            //                     avatar: conv.lastMessage.sender.avatar,
            //                     status: conv.lastMessage.sender.status,
            //                     lastActive: conv.lastMessage.sender.lastActive
            //                 },
            //                 createdAt: conv.lastMessage.createdAt,
            //                 updatedAt: conv.lastMessage.updatedAt,
            //                 type: conv.lastMessage.type,
            //                 isRecalled: conv.lastMessage.isRecalled,
            //                 recallType: conv.lastMessage.recallType,
            //                 attachments: conv.lastMessage.attachments || []
            //             } : undefined;

            //             const baseConversation = {
            //                 _id: conversationId,
            //                 type: conv.type,
            //                 lastMessage: enrichedLastMessage,
            //                 createdAt: conv.createdAt,
            //                 updatedAt: conv.updatedAt || conv.createdAt,
            //                 participants: enrichedParticipants,
            //                 unreadCount,
            //                 isFriendshipPending: conv.isFriendshipPending || false,
            //                 friendRequestStatus: conv.friendRequestStatus || 'none'
            //             };

            //             if (conv.type === 'group') {
            //                 return {
            //                     ...baseConversation,
            //                     participantUnreadCount: conv.participantUnreadCount || {},
            //                     unreadCount: conv.participantUnreadCount?.[userIdString] || 0,
            //                     name: conv.name,
            //                     avatarGroup: conv.avatarGroup,
            //                     creator: conv.creator ? conv.creator.toString() : null,
            //                     lastMessage: conv.lastMessage ? {
            //                         ...conv.lastMessage,
            //                         readBy: conv.lastMessage.readBy || []
            //                     } : null
            //                 };
            //             }

            //             const otherParticipant = enrichedParticipants.find(p =>
            //                 p._id.toString() !== userIdString
            //             );

            //             return {
            //                 ...baseConversation,
            //                 otherParticipant: otherParticipant || null
            //             };
            //         });

            //         // Sắp xếp theo thời gian mới nhất
            //         const sortedConversations = enrichedConversations.sort((a, b) => {
            //             const aTime = a.lastMessage?.createdAt || a.updatedAt || a.createdAt;
            //             const bTime = b.lastMessage?.createdAt || b.updatedAt || b.createdAt;
            //             return new Date(bTime) - new Date(aTime);
            //         });

            //         socket.emit('conversations:list', sortedConversations);
            //     } catch (error) {
            //         console.error('Error in get conversations handler:', error);
            //         socket.emit('error', { message: error.message });
            //     }
            // });

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


            socket.on('join:conversation', async (conversationId) => {
                console.log(`User ${userId} joined conversation ${conversationId}`);
                try {
                    const conversation = await Conversation.findById(conversationId)
                        .populate('participants')
                        .lean();

                    if (!conversation) {
                        throw new Error('Conversation not found');
                    }

                    const isParticipant = conversation.participants.some(p =>
                        p._id.toString() === userId.toString()
                    );

                    if (!isParticipant) {
                        throw new Error('User is not a participant of this conversation');
                    }

                    await Message.updateMany(
                        {
                            conversationId,
                            readBy: { $type: "object", $not: { $type: "array" } }
                        },
                        {
                            $set: { readBy: [] }
                        }
                    );

                    await Message.updateMany(
                        {
                            conversationId,
                            $or: [
                                { readBy: { $exists: false } },
                                { readBy: null }
                            ]
                        },
                        {
                            $set: { readBy: [] }
                        }
                    );

                    const result = await Message.updateMany(
                        {
                            conversationId,
                            'readBy.user': { $ne: userId }
                        },
                        {
                            $push: {
                                readBy: {
                                    user: userId,
                                    readAt: new Date()
                                }
                            },
                            $set: { status: 'read' }
                        }
                    );
                    await Conversation.findByIdAndUpdate(
                        conversationId,
                        {
                            unreadCount: 0
                        }
                    )

                    socket.join(`conversation:${conversationId}`);

                    if (result.modifiedCount > 0) {
                        const updatedMessages = await Message.find({
                            conversationId,
                            'readBy.user': userId
                        });

                        io.to(`conversation:${conversationId}`).emit('messages:read',
                            updatedMessages.map(msg => ({
                                _id: msg._id,
                                conversationId: msg.conversationId,
                                status: 'read',
                                readAt: new Date(),
                            }))
                        );
                    }

                } catch (error) {
                    console.error('Error in join conversation handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

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

                    const conversation = await Conversation.findById(conversationId)
                        .populate('participants', 'name avatar status lastActive');

                    const recipientSocket = await io.in(`conversation:${conversationId}`).fetchSockets();
                    const activeUserIds = recipientSocket.map(socket => socket.user._id.toString());
                    const activeRecipients = activeUserIds.filter(id => id !== userId);


                    const readBy = [{
                        user: userId,
                        readAt: new Date()
                    }];

                    if (activeRecipients.length > 0) {
                        readBy.push(...activeRecipients.map(id => ({
                            user: id,
                            readAt: new Date()
                        })));
                    }
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
                        status: 'sent',
                        sentAt: createdAt || new Date(),
                        tempId,
                        readBy
                    });

                    await message.populate([
                        { path: 'sender', select: 'name avatar _id' },
                        { path: 'reactions.user', select: 'name avatar _id' },
                        { path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'name avatar' } }
                    ]);
                    await message.save();


                    if (conversation.type === 'group') {

                        const inactiveParticipants = conversation.participants
                            .filter(p => {
                                const participantId = p._id.toString();
                                return participantId !== userId && !activeRecipients.includes(participantId);
                            });

                        if (inactiveParticipants.length > 0) {
                            const bulkOps = inactiveParticipants.map(participant => ({
                                updateOne: {
                                    filter: {
                                        _id: conversationId,
                                    },
                                    update: {
                                        $inc: { [`participantUnreadCount.${participant._id}`]: 1 },
                                        $set: {
                                            lastMessage: message._id,
                                            updatedAt: new Date()
                                        }
                                    }
                                }
                            }))
                            await Conversation.bulkWrite(bulkOps);
                        } else {
                            await Conversation.findByIdAndUpdate(
                                conversationId,
                                {
                                    lastMessage: message._id,
                                    updatedAt: new Date(),
                                }
                            )
                        }
                        // await Conversation.bulkWrite(bulkOps);

                    } else {

                        const recipientId = conversation.participants.find(p => p._id.toString() !== userId)._id.toString();

                        const shouldIncrementUnread = !activeRecipients.includes(recipientId);

                        await Conversation.findByIdAndUpdate(
                            conversationId,
                            {
                                lastMessage: message._id,
                                updatedAt: new Date(),
                                ...(shouldIncrementUnread ? { $inc: { unreadCount: 1 } } : {})
                            }
                        );
                    }

                    const participants = conversation.participants;
                    for (const participant of participants) {

                        const participantId = participant._id.toString();
                        const participantSockets = await io.in(`user:${participantId}`).fetchSockets();
                        const isActiveRecipient = activeRecipients.includes(participantId);

                        const unreadCount = participantId === userId || isActiveRecipient
                            ? 0
                            : (conversation.type === 'group')
                                ? (conversation.participantUnreadCount?.get(participantId) || 0) + 1
                                : (!isActiveRecipient ? (conversation.unreadCount || 0) + 1 : 0);

                        for (const socket of participantSockets) {
                            socket.emit('new:message', {
                                ...message.toObject(),
                                conversationId,
                                unreadCount,
                                isUnread: participantId !== userId && !isActiveRecipient,
                                readBy: message.readBy,
                            });
                        }
                    }

                    if (callback) {
                        callback(null, message);
                    }
                } catch (error) {
                    console.error('Error in send message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            });

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
                        status: 'delivered',
                    }

                    const updateMessage = await Message.findByIdAndUpdate(
                        messageId,
                        updateData,
                        { new: true }
                    ).populate({
                        path: 'sender',
                        select: 'name avatar status lastActive'  // Thêm status và lastActive
                    });

                    const messageSender = updateMessage.sender;

                    io.to(`conversation:${conversationId}`).emit('message:recalled', {
                        messageId,
                        recallType,
                        message: updateMessage,
                        sender: {
                            _id: messageSender._id,
                            name: messageSender.name,
                            avatar: messageSender.avatar,
                            status: messageSender.status,
                            lastActive: messageSender.lastActive
                        },
                        originalContent: content
                    });

                    const conversation = await Conversation.findById(conversationId);

                    const update = {
                        lastMessage: updateMessage._id,
                        updatedAt: new Date()
                    }

                    await Conversation.findByIdAndUpdate(conversationId, update, { new: true });

                    const otherParticipant = conversation.participants.find(participant => participant._id.toString() !== userId.toString());
                    if (conversation.lastMessage.toString() === messageId) {
                        io.to(`conversation:${conversationId}`).emit('conversation:updated', {
                            _id: conversationId,
                            type: conversation.type,
                            name: conversation.name,
                            avatarGroup: conversation.avatarGroup,
                            otherParticipant: conversation.type === 'private' ? {
                                _id: otherParticipant._id,
                                name: otherParticipant.name,
                                avatar: otherParticipant.avatar,
                                status: otherParticipant.status,
                                lastActive: otherParticipant.lastActive
                            } : undefined,
                            lastMessage: {
                                ...updateMessage.toObject(),
                                content: recallType === 'everyone'
                                    ? (sender._id === userId ? 'You have recalled a message' : `${sender.name} has recalled a message`)
                                    : (recallType === 'self' && sender._id === userId)
                                        ? 'You have recalled a message'
                                        : content,
                                sender: {
                                    _id: messageSender._id,
                                    name: messageSender.name,
                                    avatar: messageSender.avatar,
                                    status: messageSender.status,
                                    lastActive: messageSender.lastActive
                                }
                            },
                            unreadCount: conversation.unreadCount,
                            participantUnreadCount: conversation.participantUnreadCount,
                            updatedAt: new Date()
                        });
                    }
                } catch (error) {
                    console.error('Error in recall message handler:', error);
                    socket.emit('error', { message: error.message });
                }
            })

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
                                },
                                {
                                    path: 'readBy.user',
                                    select: 'name avatar'
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

                    // Update messages that don't have readBy array
                    await Message.updateMany(
                        {
                            conversationId: validConversationId,
                            'readBy.user': { $ne: userId },
                            sender: { $ne: userId }
                        },
                        {
                            $addToSet: {
                                readBy: {
                                    user: userId,
                                    readAt: new Date()
                                }
                            },
                            $set: {
                                status: 'read',
                                readAt: new Date()
                            }
                        }
                    );


                    if (conversation.type === 'group') {
                        await Conversation.updateOne(
                            { _id: validConversationId },
                            {
                                $set: {
                                    [`participantUnreadCount.${userId}`]: 0
                                }
                            }
                        )
                    } else {
                        await Conversation.updateOne(
                            { _id: validConversationId },
                            {
                                $set: {
                                    unreadCount: 0
                                }
                            }
                        )
                    }


                    const updatedMessages = await Message.find({
                        conversationId: validConversationId,
                        'readBy.user': userId
                    }).populate('readBy.user', 'name avatar');

                    io.in(`conversation:${validConversationId}`).emit('message:status-updated',
                        updatedMessages.map(msg => ({
                            _id: msg._id,
                            conversationId: msg.conversationId,
                            status: 'read',
                            readAt: new Date(),
                            readBy: msg.readBy,
                        }))
                    );
                    // }

                } catch (error) {
                    console.error('Error updating message status:', error);
                }
            });

            socket.on('mark:conversation-read', async (conversationId) => {
                try {
                    await Message.updateMany({
                        conversationId,
                        sender: { $ne: userId },
                        status: { $ne: 'read' },
                        'readBy.user': { $ne: userId }
                    }, {
                        status: 'read',
                        readAt: new Date(),
                        $set: {
                            readBy: {
                                user: userId,
                                readAt: new Date()
                            }
                        }
                    })

                    const readMessages = await Message.find({
                        conversationId,
                        status: 'read',
                        sender: { $ne: userId }
                    })

                    io.to(`conversation:${conversationId}`).emit('message:status-updated',
                        readMessages.map(msg => ({
                            _id: msg._id,
                            conversationId: msg.conversationId,
                            status: 'read',
                            readAt: new Date()
                        }))
                    )

                    await Conversation.findByIdAndUpdate(conversationId, {
                        $set: { unreadCount: 0 },
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

                    console.log('Requester User:', requesterUser);
                    console.log('Recipient User:', recipientUser);

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

                    console.log('Creating friendship request:', {
                        requester: requesterId,
                        recipient: recipientId,
                        status: 'pending'
                    });
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


                    await Conversation.findOneAndUpdate(
                        {
                            type: 'private',
                            participants: { $all: [requesterId, recipientId] }
                        },
                        {
                            friendRequestStatus: 'pending',
                            isFriendshipPending: true
                        }
                    )
                    const updatedConversation = await Conversation.findOne({
                        type: 'private',
                        participants: { $all: [requesterId, recipientId] }
                    }).populate('participants', 'name avatar status lastActive');

                    io.to(requesterId).emit('conversation:updated', {
                        ...updatedConversation.toObject(),
                        friendRequestStatus: 'pending',
                        isFriendshipPending: true
                    });
                    io.to(recipientId).emit('conversation:updated', {
                        ...updatedConversation.toObject(),
                        friendRequestStatus: 'pending',
                        isFriendshipPending: true
                    });
                } catch (error) {
                    socket.emit('friendRequestError', {
                        message: 'Error sending friend request'
                    })
                }
            })

            socket.on('cancelFriendRequest', async ({ requesterId, recipientId }) => {
                try {

                    const existingFriendship = await Friendships.findOne({
                        requester: requesterId,
                        recipient: recipientId,
                        status: 'pending'
                    })

                    if (!existingFriendship) {
                        return socket.emit('friendRequestCancelled', {
                            requesterId,
                            recipientId
                        });
                    }

                    await Conversation.findOneAndUpdate(
                        {
                            type: 'private',
                            participants: { $all: [requesterId, recipientId] }
                        },
                        {
                            friendRequestStatus: 'recalled',
                            isFriendshipPending: true
                        }
                    )
                    await Friendships.findOneAndDelete({
                        requester: requesterId,
                        recipient: recipientId,
                        status: 'pending'
                    });

                    const updatedConversation = await Conversation.findOne({
                        type: 'private',
                        participants: { $all: [requesterId, recipientId] }
                    }).populate('participants', 'name avatar status lastActive');

                    io.to(requesterId).emit('conversation:updated', {
                        ...updatedConversation.toObject(),
                        friendRequestStatus: 'recalled',
                        isFriendshipPending: true
                    });
                    io.to(recipientId).emit('conversation:updated', {
                        ...updatedConversation.toObject(),
                        friendRequestStatus: 'recalled',
                        isFriendshipPending: true
                    });

                    io.to(recipientId).emit('friendRequestCancelled', { requesterId });
                } catch (error) {
                    console.error('Error cancelling friend request:', error);
                    socket.emit('friendRequestError', {
                        message: 'Error cancelling friend request'
                    });
                }
            })

            socket.on('respondToFriendRequest', async (data, callback) => {
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
                                ? `You have accepted the friend request from ${friendship.requester.name}`
                                : `You have rejected the friend request ${friendship.requester.name}`,
                            isRead: true
                        }
                    );
                    const requesterNotification = new Notifications({
                        userId: friendship.requester._id,
                        type: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_rejected',
                        referenceId: requestId,
                        content: status === 'accepted'
                            ? `${friendship.recipient.name} accepted your friend request`
                            : `${friendship.recipient.name} rejected your friend request`,
                        isRead: false,
                        sender: {
                            _id: userId,
                            name: socket.user?.name,
                            avatar: socket.user?.avatar
                        }
                    });
                    await requesterNotification.save();

                    io.sockets.sockets.forEach((socket) => {
                        if (socket.user?._id?.toString() === friendship.requester._id.toString()) {
                            socket.emit('friendRequestResponded', {
                                type: status === 'accepted' ? 'friend_request_accepted' : 'friend_request_rejected',
                                notification: requesterNotification.toObject()
                            });
                        }
                    });

                    if (status === 'accepted') {
                        let existingConversation = await Conversation.findOne({
                            type: 'private',
                            participants: { $all: [friendship.requester._id, friendship.recipient._id] }
                        }).populate('participants', 'name avatar status lastActive');

                        if (!existingConversation) {
                            existingConversation = new Conversation({
                                type: 'private',
                                participants: [friendship.requester._id, friendship.recipient._id],
                                creator: userId,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                                isFriendshipPending: false,
                                friendRequestStatus: 'none'
                            });

                            await existingConversation.save();
                            await existingConversation.populate('participants', 'name avatar status lastActive');

                        } else {
                            existingConversation.isFriendshipPending = false;
                            existingConversation.friendRequestStatus = 'none';
                            await existingConversation.save();
                        }

                        // const conversation = new Conversation({
                        //     type: 'private',
                        //     participants: [friendship.requester._id, friendship.recipient._id],
                        //     creator: userId,
                        //     createdAt: new Date(),
                        //     updatedAt: new Date(),

                        // })
                        // await conversation.save();

                        // await conversation.populate({
                        //     path: 'participants',
                        //     select: 'name avatar status lastActive'
                        // });

                        const enrichedConversation = {
                            _id: existingConversation._id.toString(),
                            type: 'private',
                            participants: existingConversation.participants.map(p => ({
                                _id: p._id.toString(),
                                name: p.name,
                                avatar: p.avatar,
                                status: p.status,
                                lastActive: p.lastActive
                            })),
                            lastMessage: existingConversation.lastMessage,
                            createdAt: existingConversation.createdAt,
                            updatedAt: existingConversation.updatedAt,
                            otherParticipant: existingConversation.participants.find(
                                p => p._id.toString() !== userId.toString()
                            ),
                            isFriendshipPending: false,
                            friendRequestStatus: 'none'
                        };

                        // Use callback to return conversation


                        // const createEnrichedConversation = (forUserId) => ({
                        //     _id: conversation._id.toString(),
                        //     type: 'private',
                        //     participants: conversation.participants.map(p => ({
                        //         _id: p._id.toString(),
                        //         name: p.name,
                        //         avatar: p.avatar,
                        //         status: p.status,
                        //         lastActive: p.lastActive
                        //     })),
                        //     lastMessage: null,
                        //     createdAt: conversation.createdAt,
                        //     updatedAt: conversation.updatedAt,
                        //     otherParticipant: conversation.participants.find(
                        //         p => p._id.toString() !== userId.toString()
                        //     )
                        // });
                        // const requesterConversation = createEnrichedConversation(friendship.requester._id);

                        // io.to(friendship.requester._id).emit('friendRequestAccepted', {
                        //     type: 'friend_request_accepted',
                        //     conversation: enrichedConversation
                        // });

                        // // const recipientConversation = createEnrichedConversation(friendship.recipient._id);
                        // io.to(friendship.recipient._id).emit('friendRequestAccepted', {
                        //     type: 'friend_request_accepted',
                        //     conversation: enrichedConversation
                        // });

                        io.sockets.sockets.forEach((socket) => {
                            // Kiểm tra nếu socket thuộc về người gửi hoặc người nhận friend request
                            if (
                                socket.user?._id?.toString() === friendship.recipient._id.toString() ||
                                socket.user?._id?.toString() === friendship.requester._id.toString()
                            ) {
                                socket.emit('conversation:created', {
                                    ...enrichedConversation,
                                    otherParticipant: enrichedConversation.participants.find(
                                        p => p._id.toString() !== socket.user._id.toString()
                                    )
                                });
                            }
                        });

                        if (callback) {
                            callback(enrichedConversation);
                        }
                    }
                    //  else if (status === 'rejected') {
                    //     io.to(friendship.requester._id.toString()).emit('friendRequestRejected', {
                    //         type: 'friend_request_rejected',
                    //         notification: requesterNotification
                    //     });
                    // }
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