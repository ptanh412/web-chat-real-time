const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        min: 3,
        max: 20,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        required: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
    },
    avatar:{
        type: String,
        default: '',
    },
    status: {
        type: String,
        default: 'offline',
        enum: ['offline', 'online'],
    },
    lastActive: {
        type: Date,
        default: Date.now,
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
// userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('Users', userSchema);