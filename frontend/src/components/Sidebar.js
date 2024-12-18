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
  const navigation = useNavigate();



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
        } catch (error) {
          console.log("Fetch notifications failed: ", error);
        }
      }
    }
    fetchNotification();

    if (socket && user?._id) {
      const handleNewFriendRequest = (requestData) => {

        if (requestData.notification) {

          if (requestData?.notification) {
            setNotifications((prev) => {
              const isExisting = prev.some(n => n._id === requestData.notification._id);

              if (!isExisting) {
                const updatedNotification = [
                  requestData.notification,
                  ...prev
                ];

                const unreadCount = updatedNotification.filter(
                  n => !n.isRead &&
                    (n.type === 'friend_request' || n.type === 'message')
                ).length;
                setUnreadNotificationsCount(unreadCount);
                return updatedNotification;
              }
              return prev;
            })

          }
        }
      }
      const handleFriendRequestSent = (requestData) => {
        console.log('Friend request sent:', requestData);
      };

      const handleFriendRequestError = (error) => {
        console.error('Friend request error:', error);
      };

      // Add socket listeners
      socket.on('newFriendRequest', handleNewFriendRequest);
      socket.on('friendRequestSent', handleFriendRequestSent);
      socket.on('friendRequestError', handleFriendRequestError);

      // Cleanup listeners
      return () => {
        socket.off('newFriendRequest', handleNewFriendRequest);
        socket.off('friendRequestSent', handleFriendRequestSent);
        socket.off('friendRequestError', handleFriendRequestError);
      };
    }
  }, [socket, user?._id]);

  const handleNotification = () => {
    setShowNotification(!showNotification)
    const readNotifications = notifications.map(n => ({
      ...n,
      isRead: true,
    }));
    setNotifications(readNotifications);
    setUnreadNotificationsCount(0);

    socket.emit('markNotificationAsRead', {
      userId: user._id,
      notificationIds: notifications.map(n => n._id)
    });
  }

  const handleAcceptFriendRequest = async (requestId) => {
    if (socket) {
      socket.emit('respondToFriendRequest', {
        requestId,
        status: 'accepted',
        userId: user._id,
      })

      setNotifications((prev) => prev.filter((n) => n.referenceId !== requestId));
    }
  }

  const handleRejectFriendRequest = async (requestId) => {
    if (socket) {
      socket.emit('respondToFriendRequest', {
        requestId,
        status: 'rejected',
        userId: user._id,
      });

      setNotifications((prev) => prev.filter((n) => n.referenceId !== requestId));
    }
  };

  const handleLogout = () => {
    logout();
    navigation("/");
    showAlert("Logout successfully", "success");
  };
  return (
    <div className="flex flex-col items-center h-screen mt-2 ">
      <img src={user.avatar} alt="avatar" className="w-16 h-16 rounded-full" />
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
          <AiOutlineMessage className="hover:text-blue-300 duration-300" />
        </li>
        <li className="mb-10">
          <IoIosSearch className="hover:text-blue-300 duration-300" />
        </li>

        <li className="mb-10">
          <RiProfileLine className="hover:text-blue-300 duration-300" />
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
                      className={`flex items-center space-x-3 p-2 rounded-lg ${notification.isRead === false
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-100'
                        }`}
                    >
                      {notification.type === 'friend_request' && (
                        <>
                          <img
                            src={notification.sender?.avatar || ''}
                            alt={notification.sender?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
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
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </>
                      )}

                      {notification.type === 'message' && (
                        <div className="flex items-center space-x-3 w-full">
                          <img
                            src={notification.sender?.avatar || '/default-avatar.png'}
                            alt={notification.sender?.name || 'User'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <p className="text-sm">{`${notification.sender?.name} send you message`}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                      )}
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
