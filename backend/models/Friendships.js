const mongoose = require('mongoose');

const FriendshipsSchema = new mongoose.Schema({
    requester: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ['requester', 'recipient', 'status'],
            partialFilterExpression: { status: 'pending' }
        }
    ]   
});

module.exports = mongoose.model('Friendships', FriendshipsSchema);