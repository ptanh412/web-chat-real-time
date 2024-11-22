const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversations',
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'image', 'video', 'audio', 'file'],
        default: 'text',
    },
    status:{
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
    },
    attachments:[{
        url: String,
        type: String,
        name: String,
        size: Number,
        mimeType: String,
    }],
    readBy: {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
        },
        readAt: {
            type: Date
        },
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Messages', messageSchema);