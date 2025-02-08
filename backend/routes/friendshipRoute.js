//...routes/friendshipRoute.js
const express = require('express');
const router = express.Router();
const friendshipController = require('../controllers/friendshipContronller');
const auth = require('../middlewares/auth')

router.post('/friend-request',auth, friendshipController.sendFriendRequest);
router.get('/friend-request',auth, friendshipController.getFriendRequests);
router.put('/friend-request/:friendshipId/accept',auth, friendshipController.acceptFriendRequest);
router.put('/friend-request/:friendshipId/reject',auth, friendshipController.rejectedFriendRequest);
router.delete('/friend/:friendshipId',auth, friendshipController.removeFriend);
router.get('/friendList',auth, friendshipController.getFriendList);
router.get('/unfriend',auth, friendshipController.getUnfriend);
router.get('/pending-request',auth, friendshipController.getPendingFriendRequests);

module.exports = router;