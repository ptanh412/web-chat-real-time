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
        default: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1732683090/blank-profile-picture-973460_1280_docdnf.png',
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

module.exports = mongoose.model('Users', userSchema);