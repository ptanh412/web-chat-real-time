const Messages = require('../models/Messages');
const Conversations = require('../models/Conservations');

const createMessage = async ({ conversationId, sender, content, type, attachments }) => {
    const message = new Messages({ conversationId, sender, content, type, attachments });
    const savedMessage =  await message.save();
    await Conversations.findByIdAndUpdate(conversationId, { lastMessage: message._id, updatedAt: new Date() }, { new: true });
    return savedMessage;
};

const getMessages = async({ conversationId, limit, skip}) =>{
    return await Messages.find({conversationId})
        .sort({createdAt: -1})
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name avatar')
        .populate('readBy.user', 'name avatar');
};

const markAsRead = async ({ messageId, userId }) => {
    const message = await Messages.findById(
        messageId,
        {
            $set: {
                'readBy.user': userId,
                'readBy.readAt': new Date()
            },   
        },
        { new: true }
    );
    return message;
}
module.exports = {
    createMessage,
    getMessages,
    markAsRead
};