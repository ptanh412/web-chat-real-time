const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    type: {
        type: String,
        required: true,
        enum: ['friend_request','friend_request_accepted', 'friend_request_rejected', 'message', 'call'],
    },
    referenceId:{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },  
    content: {
        type: String,
        required: true,
    },
    sender:{
        _id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users'
        },
        name: String,
        avatar: String,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});
const Notifications = mongoose.models.Notifications || mongoose.model('Notifications', notificationSchema);

module.exports = Notifications;