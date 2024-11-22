// ../middlewares/socketAuth.js
const {verifyToken} = require('../utils/jwt');
const User = require('../models/Users');

const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        console.log(token);
        if (!token) {
            return next(new Error('Token is required'));
        }
        const decoded = verifyToken(token);
        console.log('decode: ', decoded);
        const user = await User.findById(decoded.id);
        console.log('user: ', user);
        if (!user) {
            return next(new Error('User not found'));
        }
        socket.user = user;
        next();
    } catch (error) {
        console.log('Socket auth error: ',error);
        next(error);
    }
}

module.exports = socketAuth;