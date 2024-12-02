// ../services/userService.js
const User = require('../models/Users');
const { hashPassword, comparePassword } = require('../utils/encryption');
const { generateToken } = require('../utils/jwt');


const createUser = async ({ name, email, password, avatar }) => {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new Error('User already exists');
    }
    const hashedPassword = await hashPassword(password);
    const user = new User({ name, email, password: hashedPassword, avatar });
    return await user.save();
};

const authenticateUser = async ({ email, password }) => {
    const user = await User.findOne({ email });
    if (!user) {
        throw new Error('User not found');
    }
    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) {
        throw new Error('Password is incorrect');
    }
    const token = generateToken({ id: user._id });
    await User.findByIdAndUpdate(user._id, { status: 'online', lastActive: new Date() });
    return { token, name: user.name, avatar: user.avatar, status: user.status, _id: user._id };
};

const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};
const updateUser = async (id, data) => {
    const allowedFields = ['name', 'email', 'avatar'];
    const filterData = Object.keys(data)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
        }, {});

    return await User.findByIdAndUpdate(id, filterData, {
        new: true,
    });
}
const updatePassword = async (id, password) => {
    const hashedPassword = await hashPassword(password);
    return await User.findByIdAndUpdate(id, { password: hashedPassword }, {
        new: true,
    });
};
const updateStatus = async (userId, status) => {
    console.log(`Updating status for user ${userId} to ${status}`);
    try {
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                status,
                lastActive: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        );
        console.log('Updated user status:', updatedUser);
        return updatedUser;
    } catch (error) {
        console.error('Error updating status:', error);
        throw error;
    }
}

const getOnlineUsers = async () => {
    return await User.find({ status: 'online' }).select('name avatar');
}
const logout = async (userId) => {
    await User.findByIdAndUpdate(userId, { status: 'offline' });
}
module.exports = {
    createUser,
    authenticateUser,
    getUserById,
    updateUser,
    updatePassword,
    updateStatus,
    getOnlineUsers,
    logout
}