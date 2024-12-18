const Notifacations = require('../models/Notifications');

const createNotification = async ({ userId, type, referenceId, content }) => {
    const notification = new Notifacations({
        userId,
        type,
        referenceId,
        content,
        status: 'unread'
    });
    const savedNotification = await notification.save();
    return savedNotification;
}

const getNotificationsByUserId = async (userId, isRead = null) => {
    const filter = { userId };

    if (isRead !== null) {
        filter.isRead = isRead;
    }
    return await Notifacations.find(filter)
        .sort({ createdAt: -1 })
        .limit(20);
}

const markNotificationAsRead = async (notificationId) => {
    return await Notifacations.findByIdAndUpdate(
        notificationId,
        { status: 'read' },
        { new: true }
    );
};

const markAllNotificationsAsRead = async (userId) => {
    return await Notifacations.updateMany(
        { userId, isRead: false },
        { isRead: true }
    );
}

const deleteNotification = async (notificationId) => {
    return await Notifacations.findByIdAndDelete(notificationId);
};

const deletedAllNotifications = async (userId) => {
    return await Notifacations.deleteMany({ userId });
};

module.exports = {
    createNotification,
    getNotificationsByUserId,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    deletedAllNotifications
};