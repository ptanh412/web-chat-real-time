const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    isHidden: {
        type: Boolean,
        default: true,
    },
    isVisible:{
        type: Boolean,
        default: true,
    },
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
    participantUnreadCount: {
        type: Map,
        of: Number,
        default: () => new Map(),
    },
    name: {
        type: String,
        default: '',
    },
    avatarGroup: {
        type: String,
        default: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png',
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
    isFriendshipPending: {
        type: Boolean,
        default: false,
    },
    friendRequestSender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        default: null
    },
    friendRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Friendships',
        default: null
    },
    friendRequestStatus: {
        type: String,
        enum: ['none','pending', 'accepted', 'rejected'],
        default: 'none',
    }
});
conversationSchema.pre(/^find/, function (next) {
    this.populate({
        path: 'participants',
        select: 'name avatar status lastActive',
    });
    next();
})
module.exports = mongoose.model('Conversations', conversationSchema);    