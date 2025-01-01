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
        default: '',
        validate: {
            validator: function (value) {
                return this.attachments && this.attachments.length > 0 || (value && value.trim() !== '');
            },
            message: 'Message must have content or attachments'
        }
    },
    reactions: [{
        emoji: {
            type: String,
            enum: ['❤️', '👍', '😮', '😠', '😢'],
            required: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Users',
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now,
        }
    }],
    type: {
        type: String,
        required: true,
        enum: ['text', 'multimedia'],
        default: function () {
            return this.attachments && this.attachments.length > 0 ? 'multimedia' : 'text';
        }
    },
    status: {
        type: String,
        enum: ['sent', 'delivered', 'read'],
        default: 'sent',
    },
    sentAt: {
        type: Date,
        default: Date.now,
    },
    deliveredAt: {
        type: Date,
    },
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileType: {
            type: String,
            enum: ['image', 'video', 'pdf', 'document', 'spreadsheet', 'presentation', 'archive', 'raw', 'other'],
            default: 'other'
        },
        mimeType: String,
        fileSize: Number,
    }],
    readBy: {
        user: {
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
    tempId: {
        type: String,
        unique: true,
        sparse: true
    },
    replyTo:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Messages',
    },
    isRecalled:{
        type: Boolean,
        default: false
    },
    recallType: {
        type: String,
        enum: ['everyone', 'self']
    }
}, {
    strict: true,
    timestamps: { updatedAt: 'updatedAt' }
});

messageSchema.pre('save', function (next) {
    if ((!this.content || this.content.trim() === '') && (!this.attachments || this.attachments.length === 0)) {
        return next(new Error('Message must have content or attachments'));
    }
    next();
});

module.exports = mongoose.model('Messages', messageSchema);