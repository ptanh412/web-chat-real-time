const Friendships = require('../models/Friendships');
const Users = require('../models/Users');

const senderFriendRequest = async (requesterId, recipientId) => {
    const existingRequest = await Friendships.findOne({
        requester: requesterId,
        recipient: recipientId,
    });
    if (existingRequest) {
        throw new Error('Friend request already sent');
    }
    const friendship = new Friendships({
        requester: requesterId,
        recipient: recipientId,
        status: 'pending',
    });
    await friendship.save();
    return friendship;
}

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
            {requester: requesterId, recipient: recipientId},
            {requester: recipientId, recipient: requesterId},
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
    return await Friendships.find({
        $or: [
            { requester: userId, status: 'accepted' },
            { recipient: userId, status: 'accepted' },
        ],
    })
        .populate('requester', 'name avatar')
        .populate('recipient', 'name avatar')
        .sort({ updatedAt: -1 });
}

module.exports = {
    senderFriendRequest,
    acceptFriendRequest,
    rejectedFriendRequest,
    removeFriend,
    getFriendRequests,
    getallFriends
}

