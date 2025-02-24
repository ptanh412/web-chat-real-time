const mongoose = require('mongoose');

const fileReferenceSchema = new mongoose.Schema({
    fileHash: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    fileUrl: {
        type: String,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    fileName: {
        type: String,
        required: true
    },
    refId: {
        type: String,
        default: undefined
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Remove the unique index on refId if it exists
fileReferenceSchema.index({ refId: 1 }, { unique: false });

const FileReference = mongoose.model('FileReference', fileReferenceSchema);

module.exports = FileReference;