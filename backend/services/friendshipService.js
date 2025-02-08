//../models/friendshipService.js
const mongoose = require('mongoose');
const Friendships = require('../models/Friendships');
const Users = require('../models/Users');

const senderFriendRequest = async (requesterId, recipientId) => {
    try {
        const requesterObjectId = new mongoose.Types.ObjectId(requesterId);
        const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
        console.log('Requester id:', requesterObjectId);
        console.log('Recipient id:', recipientObjectId);

        const existingRequest = await Friendships.findOne({
            $or: [
                { requester: requesterObjectId, recipient: recipientObjectId, status: 'pending' },
                { requester: recipientObjectId, recipient: requesterObjectId, status: 'pending' }
            ]
        });

        console.log('Existing request:', existingRequest);

        if (existingRequest) {
            throw new Error('Friend request already sent and is pending');
        }

        const friendship = new Friendships({
            requester: requesterObjectId,
            recipient: recipientObjectId,
            status: 'pending'
        });

        return await friendship.save();
    } catch (error) {
        console.error('Error creating friendship:', error);
        throw error;
    }
};
const checkExistingRequest = async (requesterId, recipientId) => {
    const requesterObjectId = new mongoose.Types.ObjectId(requesterId);
    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
    return await Friendships.findOne({
        $or: [
            { requester: requesterObjectId, recipient: recipientObjectId, status: 'pending' },
            { requester: recipientObjectId, recipient: requesterObjectId, status: 'pending' }
        ]
    });
};


const acceptFriendRequest = async (friendshipId) => {
    const friendship = await Friendships.findById(friendshipId);
    if (!friendship || friendship.status !== 'pending') {
        throw new Error('Friend request not found');
    }
    friendship.status = 'accepted';
    friendship.updatedAt = new Date();
    await friendship.save();
    return friendship;
}
const rejectedFriendRequest = async (friendshipId) => {
    const friendship = await Friendships.findById(friendshipId);
    if (!friendship || friendship.status !== 'pending') {
        throw new Error('Friend request not found');
    }
    friendship.status = 'rejected';
    friendship.updatedAt = new Date();
    await friendship.save();
    return friendship;
}
const removeFriend = async (requesterId, recipientId) => {
    const friendship = await Friendships.findOneAndDelete({
        $or: [
            { requester: requesterId, recipient: recipientId },
            { requester: recipientId, recipient: requesterId },
        ],
        status: 'accepted',
    })
    return friendship;
}
const getFriendRequests = async (userId, status = 'pending') => {
    return Friendships.find({
        recipient: userId,
        status,
    })
        .populate('requester', 'name avatar')
        .sort({ createdAt: -1 });
}

const getallFriends = async (userId) => {
    const friendship = await Friendships.find({
        $or: [
            { requester: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' },
        ],
    });
    const friendIds = friendship.map(friendship => {
        return friendship.requester.toString() == userId.toString()
            ? friendship.recipient
            : friendship.requester;
    });
    const friends = await Users.find({
        _id: { $in: friendIds },
    }).select('name avatar status');
    return friends;

}
const getUnfriend = async (userId) => {
    const friendships = await Friendships.find({
        $or: [
            { requester: userId },
            { recipient: userId },
        ]
    });
    const connectedUserIds = friendships.map(friendship => {
        return friendship.requester.toString() == userId.toString()
            ? friendship.recipient.toString()
            : friendship.requester.toString();
    })
    connectedUserIds.push(userId.toString());
    const unfriendedUsers = await Users.find({
        _id: { $nin: connectedUserIds },
    }).select('name avatar status');
    return unfriendedUsers;
}

const getPendingRequest = async (userId) => {
    return Friendships.find({
        $or: [
            { requester: userId, status: 'pending' },
            { recipient: userId, status: 'pending' },
        ]
    })
        .populate('recipient', 'name avatar')
        .populate('requester', 'name avatar')
        .sort({ createdAt: -1 });
}
module.exports = {
    senderFriendRequest,
    checkExistingRequest,
    acceptFriendRequest,
    rejectedFriendRequest,
    removeFriend,
    getFriendRequests,
    getallFriends,
    getUnfriend,
    getPendingRequest,
}

