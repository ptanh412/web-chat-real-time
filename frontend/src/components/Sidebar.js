import React, { useContext, useEffect, useState, useCallback } from "react";
import { LuHome } from "react-icons/lu";
import { AiOutlineMessage } from "react-icons/ai";
import { IoIosSearch, IoMdSettings, IoMdNotificationsOutline } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import { RiProfileLine } from "react-icons/ri";
import { useUser } from "../context/UserContext";
import { GoDotFill } from "react-icons/go";
import { useNavigate } from "react-router-dom"; // Import useNavigateimport axios from "axios";
import { MdClose } from "react-icons/md";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";

const Sidebar = () => {
  const { user, socket, logout } = useUser();
  const { showAlert } = useContext(AlertContext);
  const [showNotification, setShowNotification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [hasClick, setHasClick] = useState(false);
  const navigation = useNavigate();

  const handleProfileClick = () =>{
    navigation("/profile");
  }
  const handleMessageClick = () =>{
    navigation("/chat");
  }
  useEffect(() => {
    const unreadCount = notifications.filter(
      n => !n.isRead && (n.type === 'friend_request' || n.type === 'message')
    ).length;
    setUnreadNotificationsCount(unreadCount);
  }, [notifications]);

  const formatTimeAgo = (date) => {
    const diff = new Date() - new Date(date);
    const seconds = diff / 1000;

    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const minutes = seconds / 60;

    if (minutes < 60) return `${Math.floor(minutes)}m`;
    const hours = minutes / 60;

    if (hours < 24) return `${Math.floor(hours)}h`;
    const days = hours / 24;

    if (days < 30) return `${Math.floor(days)}d`;
    const months = days / 30;

    if (months < 12) return `${Math.floor(months)}mo`;
    const years = months / 12;

    return `${Math.floor(years)}y`;
  };
  useEffect(() => {
    const fetchNotification = async () => {
      if (user?._id) {
        try {
          const response = await axios.get(`http://localhost:5000/api/notifications`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
            },
          });
          setNotifications(response.data.notifications);
          const unreadCount = response.data.notifications.filter(
            n => !n.isRead &&
              (n.type === 'friend_request' ||
                n.type === 'message' ||
                n.type === 'friend_request_accepted' ||
                n.type === 'friend_request_rejected')
          ).length;
          setUnreadNotificationsCount(unreadCount);
        } catch (error) {
          console.log("Fetch notifications failed: ", error);
        }
      }
    }
    fetchNotification();

    if (socket && user?._id) {
      const handleNewFriendRequest = (requestData) => {

        if (requestData?.notification) {
          setNotifications((prev) => {
            const isExisting = prev.some(n => n._id === requestData.notification._id);
            if (!isExisting) {
              return [requestData.notification, ...prev];
            }
            return prev;
          })
          setUnreadNotificationsCount((prev) => prev + 1);
        }
      }

      const handleFriendRequestResponse = (data) => {
        const { notification } = data;
        if (notification) {
          setNotifications(prev => [notification, ...prev.filter(n =>
            n.referenceId !== notification.referenceId
          )]);

          if (!notification.isRead && notification.userId === user._id) {
            setUnreadNotificationsCount((prev) => prev + 1);
          }
        }

      }

      socket.on('notificationsMarkedAsRead', (response) => {
        if (response.success) {
          console.log('Notifications marked as read successfully:', response.notificationIds);
        } else {
          console.error('Failed to mark notifications as read:', response.error);
        }
      });

      // Add socket listeners
      socket.on('newFriendRequest', handleNewFriendRequest);
      socket.on('friendRequestAccepted', handleFriendRequestResponse);
      socket.on('friendRequestRejected', handleFriendRequestResponse);

      // Cleanup listeners
      return () => {
        socket.off('newFriendRequest', handleNewFriendRequest);
        socket.off('friendRequestAccepted', handleFriendRequestResponse);
        socket.off('friendRequestRejected', handleFriendRequestResponse);
        socket.off('notificationsMarkedAsRead');
      };
    }
  }, [socket, user?._id]);

  useEffect(() => {
    const unreadCount = notifications.filter(
      n => !n.isRead &&
        (
          n.type === 'friend_request' ||
          n.type === 'message' ||
          n.type === 'friend_request_accepted' ||
          n.type === 'friend_request_rejected'
        )
    ).length;
    setUnreadNotificationsCount(unreadCount);
  }, [notifications]);

  const handleNotification = () => {
    if (!hasClick) {
      setHasClick(true);
      setShowNotification(true);
    } else {
      const unreadNotificationIds = notifications
        .filter((n) => !n.isRead)
        .map((n) => n._id);

      if (unreadNotificationIds.length > 0) {
        socket.emit('markNotificationsAsRead', {
          userId: user._id,
          notificationIds: unreadNotificationIds,
        });

        // Update state to reflect the notifications are read
        setNotifications((prev) =>
          prev.map((n) =>
            unreadNotificationIds.includes(n._id)
              ? { ...n, isRead: true }
              : n
          )
        );
        setUnreadNotificationsCount(0);
      }
      setShowNotification(!showNotification);
      setHasClick(false);
    }
  };


  const handleAcceptFriendRequest = async (requestId) => {
    if (socket) {
      socket.emit('respondToFriendRequest', {
        requestId,
        status: 'accepted',
        userId: user._id,
      })

      setNotifications(prev => prev.map(n => {
        if (n.referenceId === requestId) {
          return {
            ...n,
            isRead: true,
            type: 'friend_request_accepted',
            content: 'Bạn đã chấp nhận lời mời kết bạn',
          };
        }
        return n;
      }))
      setUnreadNotificationsCount((prev) => prev - 1 >= 0 ? prev - 1 : 0);
    }
  }

  const handleRejectFriendRequest = async (requestId) => {
    if (socket) {
      socket.emit('respondToFriendRequest', {
        requestId,
        status: 'rejected',
        userId: user._id,
      });

      setNotifications(prev => prev.map(n => {
        if (n.referenceId === requestId) {
          return {
            ...n,
            isRead: true,
            type: 'friend_request_rejected',
            content: 'Bạn đã từ chối lời mời kết bạn',
          };
        }
        return n;
      }))
    }
  };
  const NotificationContent = ({ notification }) => {
    switch (notification.type) {
      case 'friend_request':
        return (
          <div className="z-50">
            <p className="text-sm font-medium">{notification.content}</p>
            <div className="flex space-x-2 mt-2">
              <button
                className="bg-blue-500 hover:bg-blue-600 transition-colors duration-300 text-white rounded-lg px-3 py-1 text-xs flex items-center space-x-1"
                onClick={() => handleAcceptFriendRequest(notification.referenceId)}
              >
                <FaCheckCircle />
                <span>Accept</span>
              </button>
              <button
                className="bg-red-500 hover:bg-red-600 transition-colors duration-300 text-white rounded-lg px-3 py-1 text-xs flex items-center space-x-1"
                onClick={() => handleRejectFriendRequest(notification.referenceId)}
              >
                <MdClose />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )
      case 'friend_request_accepted':
        return (
          <p className="text-sm text-green-600 font-medium">{notification.content}</p>
        )
      case 'friend_request_rejected':
        return (
          <p className="text-sm text-red-600 font-medium">{notification.content}</p>
        );
      default:
        return (
          <p className="text-sm font-medium">{notification.content}</p>
        );
    }
  }

  const handleLogout = () => {
    logout();
    navigation("/");
    showAlert("Logout successfully", "success");
  };
  return (
    <div className="flex flex-col items-center h-screen mt-2 z-10 ">
      <img src={user.avatar} alt="avatar" className="w-16 h-16 rounded-full z-10" />
      <p className="text-xl mt-2">{user.name}</p>
      <div className="flex items-center justify-center">
        <GoDotFill className={`text-${user.status === "online" ? "green-500" : "gray-500"}`} />
        <p className="">{user.status}</p>
      </div>
      <ul className="mt-10 text-2xl flex-[4] flex items-center flex-col">
        <li className="mb-10">
          <LuHome className="hover:text-blue-300 duration-300" />
        </li>
        <li className="mb-10">
          <AiOutlineMessage 
          className="hover:text-blue-300 duration-300" 
          onClick={handleMessageClick}
          />
        </li>
        <li className="mb-10">
          <IoIosSearch className="hover:text-blue-300 duration-300" />
        </li>

        <li className="mb-10">
          <RiProfileLine
            className="hover:text-blue-300 duration-300 cursor-pointer"
            onClick={handleProfileClick}
          />
        </li>
        <li className="mb-10 relative">
          <IoMdNotificationsOutline
            className="hover:text-blue-300 duration-300"
            onClick={handleNotification}
          />
          {unreadNotificationsCount > 0 && (
            <div className="absolute top-0 left-4 -mt-1 -mr-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
              <p className="text-xs">{unreadNotificationsCount}</p>
            </div>
          )}
          {showNotification && (
            <div className="absolute top-7 left-3  bg-white border border-gray-300 rounded-md p-4 w-80 max-h-96 overflow-y-auto shadow-xl">
              {notifications.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p className="text-sm text-black font-semibold">No notifications 😊</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notification) => (
                    <li
                      key={notification._id}
                      className={`flex items-center space-x-3 p-2 rounded-lg 
                        ${!notification.isRead
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-100'
                        }`}
                    >

                      <img
                        src={notification.sender?.avatar || ''}
                        alt={notification.sender?.name || 'User'}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <NotificationContent notification={notification} />
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </li>
        <li className="mb-10">
          <button className="text-sm" onClick={handleLogout}>Log out</button>
        </li>
      </ul>
      <IoMdSettings className="hover:text-blue-300 duration-300 flex-1 text-2xl" />
    </div>
  );
};

export default Sidebar;
