const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middlewares/auth');
router.use((req, res, next) =>{
    req.io = req.app.get('io');
    next();
})
router.post('/send', auth, messageController.sendMessage);

router.get('/:conversationId', auth, messageController.getMessages);

router.patch('/read/:messageId', auth, messageController.markAsRead);

module.exports = router;    