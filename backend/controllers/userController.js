// ..controllers/userController.js
const userService = require('../services/userService');
const getUserIdFromToken = require('../utils/getUserIdFromToken');

const register = async (req, res) => {
    try {
        const {name, email, password, avatar} = req.body;
        const result = await userService.createUser({name, email, password, avatar});
        res.status(201).json({message: "User registerd sucessfully" ,data: result});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;
        const token = await userService.authenticateUser({email, password});
        res.status(200).json({message: "User login sucessfully", data: {token}});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};

const getUserProfile = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const user = await userService.getUserById(userId);
        res.status(200).json({data: user});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};
const updateProfile = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const updateData = req.body;
        const updateUser = await userService.updateUser(userId, updateData);
        res.status(200).json({message: 'User updated successfully', data: updateUser});	
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};
const updatePassword = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { password } = req.body;
        const updatedUser = await userService.updatePassword(userId, password);
        req.app.get('socketio')
            .to(`user:${userId}`)
            .emit('password-updated', { message: 'Password updated' });	
        res.status(200).json({ message: "Password updated successfully", data: updatedUser });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateStatus = async (req, res) =>{
    try {
        const userId = getUserIdFromToken(req);
        const { status } = req.body;

        const updatedUser = await userService.updateStatus(userId, status);

        req.app.get('socketio')
            .emit('userStatusChanged', { userId, status });

        res.status(200).json({ message: 'Status updated successfully', data: updatedUser });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
}
module.exports = {
    register,
    login,
    getUserProfile,
    updateProfile,
    updatePassword,
    updateStatus
};