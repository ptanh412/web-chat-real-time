import React, { useContext, useEffect, useState, useCallback } from "react";
import { LuHome } from "react-icons/lu";
import { AiOutlineMessage } from "react-icons/ai";
import { IoIosSearch, IoMdSettings, IoMdNotificationsOutline } from "react-icons/io";
import { FaCheckCircle } from "react-icons/fa";
import { RiProfileLine } from "react-icons/ri";
import { useUser } from "../context/UserContext";
import { GoDotFill } from "react-icons/go";
import { useNavigate } from "react-router-dom"; // Import useNavigateimport axios from "axios";
import { MdOutlineCancel } from "react-icons/md";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";
const Sidebar = () => {
  const { user, socket, logout } = useUser();
  const { showAlert } = useContext(AlertContext);
  const [showListFriend, setShowListFriend] = useState(false);
  const [friends, setFriends] = useState([]);
  const [addFriends, setAddFriends] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isAddFriend, setIsAddFriend] = useState(false);
  const navigation = useNavigate();

  const handleListFriend = () => {
    setShowListFriend(!showListFriend);
  }
  const handleNotification = (e) => {
    e.preventDefault();
    setShowNotification(!showNotification);
  }
  useEffect(() => {
    const getFriends = async () => {
      try {
        const respone = await axios.get(`http://localhost:5000/api/friends/unfriend`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
            }
          })
        setFriends(respone.data.data || []);
      } catch (error) {
        console.log("Get friends failed: ", error);
      }
    }
    getFriends();
  }, [user.token])
  const handleAddFriend = useCallback(
    async (friendId) => {
      if (
        isAddFriend ||
        addFriends.includes(friendId) ||
        friends.some((f) => f.id === friendId)
      ) {
        if (addFriends.includes(friendId)) {
          showAlert("Friend request already sent", "error");
        } else if (friends.some((f) => f.id === friendId)) {
          showAlert("This person is already your friend", "error");
        } else {
          showAlert("Friend request is in progress", "error");
        }
        return;
      }

      try {
        setIsAddFriend(true);
        socket.emit("friend:request", {
          requesterId: user._id,
          recipientId: friendId,
          message: `${user.name} sent you a friend request`,
        });

        showAlert("Friend request sent successfully", "success");
        setAddFriends((prev) => [...prev, friendId]);
      } catch (error) {
        console.log("Add friend failed: ", error);
      } finally {
        setIsAddFriend(false);
      }
    },
    [isAddFriend, friends, user.token, socket]
  );
  useEffect(() => {
    if (socket && user?._id) {
      const handleRoomsList = (rooms) => {
        console.log('Rooms received from server:', rooms);
      };
      const handleConnect = () => {
        console.log('Socket connected:', socket.id);
        socket.emit('joinRoom', `user:${user._id}`);
        console.log('Join room:', `user:${user._id}`);
        socket.emit('getRooms');
      };
      socket.on('connect', handleConnect);
      socket.on('roomsList', handleRoomsList);
      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      const handleNotificationReceive = (notification) => {
        console.group('Notification Received');
        console.log('Raw notification:', notification);
        if(!notification) {
          console.warn('Received empty notification');
          return;
        }
        try {
          setNotifications((prev) => {
            const isExisting = prev.some((notif) => notif._id === notification._id);
            const updatedNotifications = isExisting 
              ? prev 
              : [...prev, notification];
            console.log('Current notifications:', updatedNotifications);
            return updatedNotifications;
          });
        } catch (error) {
          console.error('Error processing notification:', error);
        }
        console.groupEnd();
      };
      socket.on('notification:receive', handleNotificationReceive);
      socket.on('error', (error) => {
        console.error('Socket general error:', error);
      });
      return () => {
        socket.off('connect', handleConnect);
        socket.off('roomsList', handleRoomsList);
        socket.off('notification:receive', handleNotificationReceive);
        socket.off('connect_error');
        socket.off('error');
      };
    }
  }, [socket, user._id, setNotifications]);

  const handleLogout = () => {
    logout();
    navigation("/");
    showAlert("Logout successfully", "success");
  };
  return (
    <div className="flex flex-col items-center h-screen mt-2">
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
          <IoIosSearch className="hover:text-blue-300 duration-300" onClick={handleListFriend} />
        </li>
        {showListFriend && (
          <div className="fixed inset-0 flex items-center justify-center p-3 bg-black bg-opacity-50 mt-0">
            <div className="bg-white p-3 rounded-lg h-96 w-96 flex flex-col justify-center">
              <div className="flex items-center">
                <input
                  type="text"
                  className="bg-gray-200 w-full rounded-l-lg outline-none text-sm h-5 px-3 placeholder-transparent py-3"
                  placeholder="Search friend"
                />
                <IoIosSearch className="bg-gray-200 rounded-r-lg hover:bg-slate-200 transition-colors duration-300 h-6 w-5 text-gray-500" />
              </div>
              <p className="mt-2 ml-2 font-semibold text-sm">Suggestion</p>
              <ul className=" space-y-5 mt-3 flex-1">
                {Array.isArray(friends) && friends.map((friend) => (
                  <li className="flex justify-between items-center">
                    <div className="flex justify-between space-x-3 items-center">
                      <img src={friend.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
                      <p className="text-sm font-semibold">{friend.name}</p>
                    </div>
                    <div className="space-x-3">
                      <button
                        className={`text-white rounded-lg px-3 text-sm font-semibold ${addFriends.includes(friend._id)
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-red-400 hover:bg-red-300 transition-colors duration-300"
                          }`}
                        onClick={() => handleAddFriend(friend._id)}
                        disabled={addFriends.includes(friend._id)}
                      >
                        {addFriends.includes(friend._id) ? "Request sent" : "Add friend"}
                      </button>
                      <button className="bg-blue-500 hover:bg-blue-300 transition-colors duration-300 text-white rounded-lg px-3 text-sm font-semibold">Send message</button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="bg-red-500 text-white w-fit text-center rounded-lg font-semibold px-3 text-base ml-36 hover:bg-red-400 transition-colors duration-300" onClick={handleListFriend}>Close</button>
            </div>
          </div>
        )}
        <li className="mb-10">
          <RiProfileLine className="hover:text-blue-300 duration-300" />
        </li>
        <li className="mb-10 relative">
          <IoMdNotificationsOutline className="hover:text-blue-300 duration-300" onClick={handleNotification} />
          {/* {showNotification && (
            <div className="absolute top-0 left-10 bg-white border border-gray-300  rounded-md p-4 w-60 h-fit outline-none shadow-xl">
              <ul className=" space-y-5 mt-3">
                {notifications.map((notification) => (
                  <li key={notification._id}>
                    <p>{notification.content}</p>
                  </li>
                  // <li className="items-center w-48" key={notification._id}>
                  //   <div className="flex justify-between space-x-3 items-center">
                  //     <img src={notification.sender.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
                  //     <div className="w-full">
                  //       <p className="text-sm font-semibold">{notification.sender.name}</p>
                  //       <p className="text-xs text-gray-500">{notification.content}</p>
                  //     </div>
                  //   </div>
                  //   <div className="flex mt-3 space-x-5 ml-10">
                  //     <div className="bg-blue-400 hover:bg-blue-300 transition-colors duration-300 text-white rounded-lg flex items-center h-6 px-2 space-x-1">
                  //       <FaCheckCircle className=" text-sm" />
                  //       <button className="text-sm font-semibold">Accept</button>
                  //     </div>
                  //     <div className="bg-red-500 hover:bg-red-300 transition-colors duration-300 text-white rounded-lg px-3 flex justify-center items-center h-6 px-2 space-x-1">
                  //       <MdOutlineCancel className="text-sm text-white" />
                  //       <button className="text-sm font-semibold">Reject</button>
                  //     </div>
                  //   </div>
                  // </li>
                ))}
              </ul>
            </div>
          )} */}
          {showNotification && (
            <div className="absolute top-0 left-10 bg-white border border-gray-300 rounded-md p-4 w-60 h-fit outline-none shadow-xl">
              {notifications.length === 0 ? (
                <p>No notifications</p>
              ) : (
                <ul className="space-y-5 mt-3">
                  {notifications.map((notification) => (
                    <li key={notification._id}>
                      <p>{notification.content}</p>
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
