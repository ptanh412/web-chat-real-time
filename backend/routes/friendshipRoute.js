const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipContronller');

router.post('/friend-request', friendshipController.sendFriendRequest);
router.get('/friend-request', friendshipController.getFriendRequests);
router.put('friend-request/:friendshipId/accept', friendshipController.acceptFriendRequest);
router.put('friend-request/:friendshipId/reject', friendshipController.rejectedFriendRequest);
router.delete('/friend/:friendshipId', friendshipController.removeFriend);
router.get('/friends', friendshipController.getFriendList);

module.exports = router;