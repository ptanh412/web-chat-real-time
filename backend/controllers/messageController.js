const messageService = require('../services/messageService');
const socket = require('../socket/socket');
const conversationService = require('../services/conservationService');
const sendMessage = async(req,res) =>{
    try {
        const { conversationId, content, type, attachments} = req.body;
        const sender = req.user.id;
        const message = await conversationService.sendMessage(conversationId, sender, content, type, attachments);
        req.io.to(`conservation-${conversationId}`).emit('message: sent', message);
        req.io.to(`user-${conversationId}`).emit('message: received', message);
        res.status(201).json({message: 'Message sent successfully', data: message});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}

const getMessages = async(req,res) =>{
    try {
        const { conversationId } = req.params;
        const { limit, skip } = req.query;
        const messages = await messageService.getMessages(conversationId, parseInt(limit) || 50, parseInt(skip) || 0);
        res.status(200).json({data: messages});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}
const markAsRead = async (req,res) =>{
    try {
        const { messageId } = req.params;
        const userId = req.user.id;
        const updatedMessage = await messageService.markAsRead({ messageId, userId });
        req.io.to(`conservation: ${updatedMessage.conversationId}`).emit('message: read', updatedMessage);
        res.status(200).json({message: 'Message marked as read', data: updatedMessage});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}

module.exports = {
    sendMessage,
    getMessages,
    markAsRead
};