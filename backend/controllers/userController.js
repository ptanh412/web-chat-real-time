// ..controllers/userController.js
const Users = require('../models/Users');
const userService = require('../services/userService');
const { hashPassword } = require('../utils/encryption');
const getUserIdFromToken = require('../utils/getUserIdFromToken');
const { generateToken } = require('../utils/jwt');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

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

const forgotPassword = async (req, res) => {
    try {
        const {email} = req.body;
        const user = await Users.findOne({email});
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // const resetToken = await userService.generatePasswordResetToken(user._id);
        const resetToken = generateToken({ userId: user._id }, '1h');
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}`;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        })
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <div>
                    <h2>Reset Your Password</h2>
                    <p>Please reset your password using the link below:</p>
                    <a href="${resetLink}">
                        <button style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; border-radius: 8px;">
                            Reset Password
                        </button>
                    </a>
                    <p>If you are unable to click the above button, copy paste the below URL into your address bar:</p>
                    <p>${resetLink}</p>
                </div>
            `
        });
        res.json({ message: 'Password reset link sent to your email' , success: true});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) =>{
    try {
        const {token, newPassword} = req.body;
        const decode = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const hashedPassword = await hashPassword(newPassword);

        await Users.findByIdAndUpdate(decode.userId, {password: hashedPassword});

        res.json({message: 'Password reset successfully', success: true});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}

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
    forgotPassword,
    resetPassword,
    getUserProfile,
    updateProfile,
    updatePassword,
    updateStatus,
    logout
};