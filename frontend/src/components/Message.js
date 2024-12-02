import React, { useContext, useEffect, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { useUser } from "../context/UserContext";
import { GoDotFill } from "react-icons/go";
import ChatWindow from "./ChatWindow";
const Message = () => {
  const { user, socket } = useUser();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  useEffect(() => {
    if (!socket) return;
    const getUsers = async () => {
      try {
        socket.emit('get:users');
        socket.on('users:list', (usersList) => {
          const filterUsers = usersList.filter((u) => u._id !== user._id);
          setUsers(filterUsers);
          console.log("users", filterUsers);
        })
      } catch (error) {
        console.log("Error getting users", error);
      }
    }
    getUsers();
    const handleUserStatusChanged = (userData) => {
      setUsers(prevUsers =>
        prevUsers.map(u =>
          u._id === userData._id ? { ...u, status: userData.status, lastActive: userData.lastActive }
            : u
        )
      )
      console.log("user status changed", userData);
    }
    socket.on('user:online', handleUserStatusChanged);
    return () => {
      socket.off('user:online', handleUserStatusChanged);
      socket.off('users:list');
    }
  }, [socket, user._id]);
  const getLatestMessage = (userId) => {
    return new Promise((resolve) => {
      socket.emit('get:lastest-message', userId, (message) => {
        resolve(message);
      })
    })
  }
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  return (
    <div className="">
      <div className="flex justify-between items-center border-b-2 p-5">
        <h1 className="font-bold text-3xl">Message</h1>
        <IoIosAddCircle className="text-3xl text-blue-500" />
      </div>
      <div className="p-10">
        <div className="flex">
          <button className="bg-gray-100 rounded-l-lg px-3 hover:bg-gray-200 duration-150 text-gray-400">search</button>
          <input
            type="text"
            className="bg-gray-100 w-full py-1 px-3 rounded-r-lg outline-none"
            placeholder="Search message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="px-8 mb-5">
        {filteredUsers.map((userData) => (
          <div
            key={userData._id}
            className="flex justify-between items-center hover:bg-gray-200 py-2 rounded-lg px-3"
            onClick={() => setSelectedUser(userData)} 
          >
            <img
              src={userData.avatar || img1}
              alt={userData.name}
              className="rounded-lg w-10 h-10"
            />
            <div className="text-left w-32">
              <h1 className="font-semibold">{userData.name}</h1>
              <span
                className={`h-2 w-2 rounded-full ${userData.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  }`}
              />
              <p className="text-xs text-gray-500">
                {userData.status === 'online'
                  ? 'mmmmmmmmmmmm': `Last active: ${new Date(userData.lastActive).toLocaleString()}`
                }
              </p>
            </div>
            <p className="text-sm text-gray-400 font-bold text-right">
              {userData.status === 'online' ? <GoDotFill className="text-green-500"/> : <GoDotFill className=""/>}
            </p>
          </div>
        ))}
      </div>
      {selectedUser && (
        <ChatWindow
          selectedUser={selectedUser}
          currentUser={user}
        />
      )}
    </div>
  );
};

export default Message;
