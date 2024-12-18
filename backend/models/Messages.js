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
        // Loại bỏ required: true
        validate: {
            validator: function(value) {
                // Kiểm tra nếu không có attachments thì content phải có nội dung
                return this.attachments && this.attachments.length > 0 || (value && value.trim() !== '');
            },
            message: 'Message must have content or attachments'
        }
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'multimedia'],
        // Tự động xác định loại tin nhắn dựa trên nội dung
        default: function() {
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
    tempId:{
        type: String,
        unique: true,
        sparse: true
    }
}, {
    // Thêm tùy chọn để cho phép custom validation
    strict: true,
    // Tự động cập nhật updatedAt
    timestamps: { updatedAt: 'updatedAt' }
});

// Pre-save hook để kiểm tra điều kiện
messageSchema.pre('save', function(next) {
    // Nếu không có nội dung và không có file đính kèm
    if ((!this.content || this.content.trim() === '') && (!this.attachments || this.attachments.length === 0)) {
        return next(new Error('Message must have content or attachments'));
    }
    next();
});

module.exports = mongoose.model('Messages', messageSchema);