//..../controllers/friendshipController.js
const friendshipService = require('../services/friendshipService');
const sendFriendRequest = async (req, res) => {
    try {
        const {recipientId} = req.body;
        const requesterId = req.user._id;
        
        console.log("Requester id: ", requesterId);
        console.log("Recipient id: ", recipientId);
        const friendship = await friendshipService.senderFriendRequest(requesterId, recipientId);
        res.status(201).json({success: true, data: friendship});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}

const acceptFriendRequest = async (req, res) => {
    try {
        const friendshipId = req.params;
        const friendship = await friendshipService.acceptFriendRequest(friendshipId);
        res.status(200).json({success: true, data: friendship});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}

const rejectedFriendRequest = async (req, res) => {
    try {
        const friendshipId = req.params;
        const friendship = await friendshipService.rejectedFriendRequest(friendshipId);
        res.status(200).json({success: true, data: friendship});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}

const removeFriend = async (req, res) => {
    try {
        const {friendshipId} = req.params;
        const userId = req.user._id;
        const friendship = await friendshipService.removeFriend(userId, friendshipId);
        res.status(200).json({success: true, data: friendship});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}

const getFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const {status} = req.query;
        const friendRequests = await friendshipService.getFriendRequests(userId, status);
        res.status(200).json({success: true, data: friendRequests});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}

const getFriendList = async (req, res) => {
    try {
        const userId = req.user._id;
        const friends = await friendshipService.getallFriends(userId);
        res.status(200).json({success: true, data: friends});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}
const getUnfriend = async(req, res) =>{
    try {
        const userId = req.user._id;
        const users = await friendshipService.getUnfriend(userId);
        res.status(200).json({success: true, data: users});
    } catch (error) {
        res.status(400).json({sucess: false, message: error.message});
    }
}

const getPendingFriendRequests = async (req, res) => {
    try {
        const userId = req.user._id;
        const sentRequests = await friendshipService.getPendingRequest(userId);
        res.status(200).json({success: true, sentRequests: sentRequests});
    } catch (error) {
        res.status(400).json({success: false, message: error.message});
    }
}
module.exports = {
    sendFriendRequest,
    acceptFriendRequest,
    rejectedFriendRequest,
    removeFriend,
    getFriendRequests,
    getFriendList,
    getUnfriend,
    getPendingFriendRequests
}   