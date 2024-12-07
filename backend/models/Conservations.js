const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    type:{
        type: String,
        required: true,
        enum: ['private', 'group'],
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    }],
    name: {
        type: String,
        default: '',
    },
    creator:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',	
    },
    unreadCount: {
        type: Number,
        default: 0,
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
conversationSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'participants',
        select: 'name avatar status lastActive',
    });
    next();
})
module.exports = mongoose.model('Conversations', conversationSchema);    