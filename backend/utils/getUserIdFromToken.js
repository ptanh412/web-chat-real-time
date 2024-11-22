const {verifyToken} = require('./jwt');
const getUserIdFromToken = (req) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        throw new Error('Token is required');
    }
    const decoded = verifyToken(token);
    return decoded.id;
};
module.exports = getUserIdFromToken;