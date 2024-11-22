const Conversations = require('../models/Conservations');
const Messages = require('../models/Messages');
const Users = require('../models/Users');
const messageService = require('./messageService');
const createConservation = async ({ type, participants, name, creator }) => {
    const users = await Users.find({ _id: { $in: participants } });
    if (users.length !== participants.length) {
        throw new Error('Some participants not found');
    }
    if (!Array.isArray(participants) || participants.length < 2) {
        throw new Error('Participants should be an array with at least 2 users');
    }
    if (type === 'private' && participants.length !== 2) {
        throw new Error('Private conversation should have 2 participants');
    }
    const conservation = new Conversations({
        type,
        participants,
        name,
        creator,
        lastMessage: null,
        unreadCount: 0,
    });
    const savedConservation = await conservation.save();
    return savedConservation;
}

const getConservations = async (userId) => {
    const conservations = await Conservations.find({ participants: { $in: [userId] } })
        .populate('participants', 'name avatar')
        .populate('creator', 'name avatar')
        .populate('lastMessage')
        .sort({ updatedAt: -1 });
    return conservations;
}

const getConservationsById = async (conversationId) => {
    const conservation = await Conversations.findById(conversationId)
        .populate('participants', 'name avatar')
        .populate('creator', 'name avatar')
        .populate('lastMessage');
    if (!conservation) {
        throw new Error('Conservation not found');
    }
    return conservation;
};
const sendMessage = async (conversationId, sender, content, type, attachments) => {
    const conversation = await Conversations.findById(conversationId);
    if (!conversation || !conversation.participants.includes(sender)) {
        throw new Error('Sender is not a participant of this conversation');
    }
    const message = await messageService.createMessage({ conversationId, sender, content, type, attachments });
    await Conversations.findByIdAndUpdate(conversationId, {
        lastMessage: message._id,
        updatedAt: new Date(),
        $inc: { unreadCount: 1 }
    });
    return message;
};
const addParticipants = async (conversationId, participants) => {
    const conversation = await Conversations.findById(conversationId);
    if (!conversation) {
        throw new Error('Conversation not found');
    }
    const users = await Users.find({ _id: { $in: participants } });
    if (users.length !== participants.length) {
        throw new Error('Some participants not found');
    }
    await Conversations.findByIdAndUpdate(conversationId, {
        $addToSet: { participants: { $each: participants } }
    });    
    return participants;
};
const updateConversation = async (conversationId, data) => {
    const conversation = await Conversations.findById(conversationId);
    if (!conversation) {
        throw new Error('Conversation not found');
    }
    const updateConversation = await Conversations.findByIdAndUpdate(conversationId, data);
    return updateConversation;
}
const deleteConversation = async (conversationId) => {
    const conversation = await Conversations.findById(conversationId);
    if (conversation.creator.toString() !== sender.toString()) {
        throw new Error('Only the creator can delete this conversation');
    }

    if (!conversation) {
        throw new Error('Conversation not found');
    }
    await Conversations.findByIdAndDelete(conversationId);
    await Messages.deleteMany({ conversationId });
    return conversation;
}
module.exports = {
    createConservation,
    getConservations,
    getConservationsById,
    sendMessage,
    addParticipants,
    updateConversation,
    deleteConversation
}