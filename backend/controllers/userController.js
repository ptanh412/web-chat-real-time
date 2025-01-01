// ..controllers/userController.js
const userService = require('../services/userService');
const getUserIdFromToken = require('../utils/getUserIdFromToken');

const register = async (req, res) => {
    try {
        const { name, email, password, avatar } = req.body;
        const result = await userService.createUser({ name, email, password, avatar });
        res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: result
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const { token, name, avatar, status, _id, lastActive, phoneNumber, about } = await userService.authenticateUser({ email, password });
        res.status(200).json({
            message: "User login sucessfully", data: {
                token,
                name,
                avatar,
                status,
                _id,
                lastActive,
                email,
                phoneNumber,
                about
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const user = await userService.getUserById(userId);
        res.status(200).json({ data: user });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const updateProfile = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const updateData = req.body;

        if (updateData.email && !updateData.email.includes('@')) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        if (updateData.phoneNumber && !/^\d{10}$/.test(updateData.phoneNumber)) {
            return res.status(400).json({ message: 'Invalid phone number format' });
        }

        const updateUser = await userService.updateUser(userId, updateData);
        res.status(200).json({ message: 'User updated successfully', data: updateUser });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
const updatePassword = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        const { oldPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({ message: 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character' });
        }
        const updatedUser = await userService.updatePassword(userId, oldPassword, newPassword);
        req.app.get('socketio')
            .to(`user:${userId}`)
            .emit('password-updated', { message: 'Password updated' });
        res.status(200).json({ message: "Password updated successfully", data: updatedUser });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateStatus = async (req, res) => {
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
const logout = async (req, res) => {
    try {
        const userId = getUserIdFromToken(req);
        await userService.logout(userId);
        res.status(200).json({ message: 'User logged out' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
module.exports = {
    register,
    login,
    getUserProfile,
    updateProfile,
    updatePassword,
    updateStatus,
    logout
};