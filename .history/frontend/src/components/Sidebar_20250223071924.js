import React, { useContext, useEffect, useState, useRef } from "react";
import { LuHome } from "react-icons/lu";
import { AiOutlineMessage } from "react-icons/ai";
import { IoIosSearch, IoMdSettings, IoMdNotificationsOutline } from "react-icons/io";
import { IoSunnyOutline } from "react-icons/io5";
import { FaMoon } from "react-icons/fa";
import { CiLogout } from "react-icons/ci";
import { FaCheckCircle } from "react-icons/fa";
import { RiProfileLine } from "react-icons/ri";
import { useUser } from "../context/UserContext";
import { GoDotFill } from "react-icons/go";
import { useLocation, useNavigate } from "react-router-dom"; // Import useNavigateimport axios from "axios";
import { MdClose } from "react-icons/md";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";
import { useTheme } from "../context/ThemeContext";

const Sidebar = () => {
  const { user, socket, logout } = useUser();
  const { showAlert } = useContext(AlertContext);
  const [showNotification, setShowNotification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [hasClick, setHasClick] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();
  const navigation = useNavigate();

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [])


  const handleSettingsClick = () => setShowSettings(!showSettings);

  const isActive = (path) => location.pathname === path;

  const handleProfileClick = () => {
    navigation("/profile");
  }
  const handleMessageClick = () => {
    navigation("/chat");
  }

  const handleHomeClick = () => {
    navigation("/home");
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



      socket.on('notificationsMarkedAsRead', (response) => {
        if (response.success) {
          console.log('Notifications marked as read successfully:', response.notificationIds);
        } else {
          console.error('Failed to mark notifications as read:', response.error);
        }
      });

      socket.on('newFriendRequest', handleNewFriendRequest);

      socket.on('friendRequestResponded', (data) => {
        const { notification, type, status } = data;

        setNotifications(prev => {
          const existingIndex = prev.findIndex(n => n.referenceId === notification.referenceId);
          if (existingIndex === -1) {
            return [notification, ...prev];
          }else {
            const updatedNotifications = [...prev];
            updatedNotifications[existingIndex] = notification;
            return updatedNotifications;
          }

        });
        if (!notification.isRead) {
          setUnreadNotificationsCount(prev => prev + 1);
        }
      })

      return () => {
        socket.off('newFriendRequest', handleNewFriendRequest);
        socket.off('notificationsMarkedAsRead');
        socket.off('friendRequestResponded');
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
      });
  
      // Update local notifications immediately for better UX
      setNotifications(prev => prev.map(n => {
        if (n.referenceId === requestId) {
          return {
            ...n,
            isRead: true,
            type: 'friend_request_accepted',
            content: 'You have accepted the friend request',
          };
        }
        return n;
      }));
      
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    }
  };

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
            content: 'You have declined the friend request.',
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
      <p className="text-xl mt-2 text-center">{user.name}</p>
      <div className="flex items-center justify-center">
        {user.status === 'online' ? (
          <>
            <GoDotFill className="text-green-500 text-center" />
            <p className="text-center font-semibold">{user.status}</p>
          </>
        ) : (
          <p className="text-center font-semibold">{user.status}</p>
        )}
        {/* <GoDotFill className={`text-${user.status === "online" ? "green-500" : "gray-500"} text-center`} />
        <p className="">{user.status}</p> */}
      </div>
      <ul className="mt-10 text-2xl flex-[4] flex items-center flex-col">
        <li className="mb-10">
          <LuHome 
          className={`hover:text-blue-300 duration-300 ${isActive('/home') ? 'text-blue-500' : ''}`} 
          onClick={handleHomeClick}
          />
        </li>
        <li className="mb-10">
          <AiOutlineMessage
            className={`hover:text-blue-300 duration-300 ${isActive('/chat') ? 'text-blue-500' : ''}`}
            onClick={handleMessageClick}
          />
        </li>
        <li className="mb-10">
          <IoIosSearch className="hover:text-blue-300 duration-300" />
        </li>

        <li className="mb-10">
          <RiProfileLine
            className={`hover:text-blue-300 duration-300 cursor-pointer ${isActive('/profile') ? 'text-blue-500' : ''}`}
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
            <div className={`absolute top-7 left-3 rounded-md p-4 w-80 max-h-96 overflow-y-auto shadow-2xl z-50 ${isDark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'}`}>
              {notifications.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p className="text-sm text-black font-semibold">No notifications 😊</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {notifications.map((notification) => (
                    <li
                      key={notification._id}
                      className={`flex items-center space-x-3 p-2 rounded-lg  cursor-pointer
                        ${!notification.isRead
                          ? isDark ? 'bg-gray-700' : 'bg-blue-50 border-l-4 border-blue-500'
                          : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
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
      </ul>
      <div className="mb-10 relative">
        <IoMdSettings
          className="hover:text-blue-300 duration-300 flex-1 text-2xl"
          onClick={handleSettingsClick}
        />
        {showSettings && (
          <div
            ref={dropdownRef}
            className={`absolute bottom-10 left-8 rounded-lg shadow-xl p-3 w-40 ${isDark ? 'bg-gray-700' : 'bg-white'}`}
          >
            <ul className="space-y-3">
              <li
                className={`flex items-center space-x-2 ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-100'} p-2 rounded-lg cursor-pointer`}
                onClick={toggleTheme}
              >
                {isDark ? <IoSunnyOutline className="text-lg" /> : <FaMoon className="text-lg" />}
                <span className="text-sm">
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </span>
              </li>
              <li
                className={`flex items-center space-x-3 p-2 rounded-lg ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-100'}  cursor-pointer`}
                onClick={handleLogout}
              >
                <CiLogout className='text-lg' />
                <span className="text-sm">Log out</span>
              </li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
};

export default Sidebar;
