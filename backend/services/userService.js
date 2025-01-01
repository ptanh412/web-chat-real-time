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
    return {
        token,
        name: user.name,
        avatar: user.avatar,
        status: user.status,
        _id: user._id,
        lastActive: user.lastActive,
        phoneNumber: user.phoneNumber,
        email: user.email,
        about: user.about
    };
};

const getUserById = async (id) => {
    return await User.findById(id).select('-password');
};
const updateUser = async (id, data) => {
    const allowedFields = ['name', 'email', 'avatar', 'phoneNumber', 'about'];
    const filterData = Object.keys(data)
        .filter(key => allowedFields.includes(key) && data[key] !== undefined && data[key] !== null)
        .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
        }, {});

    filterData.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
        id,
        filterData,
        {
            new: true,
            runValidators: true
        }
    )

    if (!updatedUser) {
        throw new Error('User not found');
    }

    return {
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        phoneNumber: updatedUser.phoneNumber,
        about: updatedUser.about
    }
}

const updatePassword = async (id, oldPassword, newPassword) => {
    const user = await User.findById(id);

    if (!user) {
        throw new Error('User not found');
    }

    if (user.googleId && !user.password) {
        throw new Error('Cannot change password for Google-authenticated accounts');
    }

    const isPasswordValid = await comparePassword(oldPassword, user.password);
    if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await User.findByIdAndUpdate(
        id,
        {
            password: hashedPassword,
            updatedAt: new Date()
        },
        {
            new: true,
        }
    )

    if (!updatedUser) {
        throw new Error('Failed to update password');
    }
    return {
        message: 'Password updated successfully'
    }
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