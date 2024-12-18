import {createContext, useState} from 'react';
export const NotificationContext = createContext();

export const NotificationProvider = ({children}) =>{
	const [notifications, setNotifications] = useState([]);
	const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

	const addNotification = (notification) =>{
		setNotifications([...notifications, notification]);
		setUnreadNotificationsCount((prev) => prev + 1);
	}

	const markAllAsRead = () =>{
		setUnreadNotificationsCount(0);
		setNotifications((prev) => prev.map((notification) => ({...notification, idRead: true})));
	}

	return (
		<NotificationContext.Provider
			value = {{
				notifications,
				unreadNotificationsCount,
				addNotification,
				markAllAsRead
			}}
		>
			{children}
		</NotificationContext.Provider>
	)
};