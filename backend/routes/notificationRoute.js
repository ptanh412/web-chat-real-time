const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middlewares/auth');

router.get('/', auth, notificationController.getNotifications);
router.post('/', auth, notificationController.createNotification);
router.put('/:notificationId', auth, notificationController.markAsRead);
router.put('/read-all', auth, notificationController.markAllAsRead);
router.delete('/:notificationId', auth, notificationController.deleteNotification);
router.delete('/delete-all', auth, notificationController.deleteAllNotifications);

module.exports = router;