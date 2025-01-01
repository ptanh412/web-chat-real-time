const notificationService = require('../services/notificationService');

const createNotification = async (req, res) => {
    try {
        const { userId, type, referenceId, content } = req.body;
        const notification = await notificationService.createNotification(
            {
                userId,
                type,
                referenceId,
                content
            }
        )
        res.status(201).json({message: 'Notification created', notification});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
};

const getNotifications = async (req, res) => {
    try {
        // const {isRead} = req.query;
        const notifications = await notificationService.getNotificationsByUserId(
            req.user._id
            // isRead !== undefined ? isRead === 'true': 'false'
        );
        res.status(200).json({
            notifications,
            total: notifications.length
        });
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}
const markAsRead = async (req, res) =>{
    try {
        const {notificationId} = req.params;
        const notification = await notificationService.markNotificationAsRead(notificationId);
        res.status(200).json({data: notification});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}
const markAllAsRead = async (req, res) => {
    try {
        await notificationService.markAllNotificationsAsRead(req.user._id);
        res.status(200).json({message: 'Marked all as read'});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}
const deleteNotification = async (req, res) => {
    try {
        const {notificationId} = req.params;
        await notificationService.deleteNotification(notificationId);
        res.status(200).json({message: 'Notification deleted'});
    } catch (error) {
        res.status(400).json({message: error.message});  
    }
}

const deletedAllNotifications = async (req, res) => {
    try {
        await notificationService.deletedAllNotifications(req.user._id);
        res.status(200).json({message: 'All notifications deleted'});
    } catch (error) {
        res.status(400).json({message: error.message});
    }
}

module.exports = {
    createNotification,
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deletedAllNotifications
}