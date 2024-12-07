import React, { useEffect, useState } from "react";
import { IoIosAddCircle } from "react-icons/io";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { useUser } from "../context/UserContext";
import { GoDotFill } from "react-icons/go";
import { FaSearch } from "react-icons/fa";

const ConvesationList = ({ setSelectedConversation, onMessageClick}) => {
  const { user, socket } = useUser();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastMessagesMap, setLastMessagesMap] = useState({});
  useEffect(() => {
    const setUpSocketListeners = () => {
      if (!socket) return;

      socket.emit('get:all-users');

      socket.on('users:list', (usersList) => {
        console.log(usersList);
        setUsers(usersList || []);
      });

      socket.on('conversation:created', (conversation) => {
        setSelectedConversation(conversation);
      });
      // if (setSelectedConversation && setSelectedConversation !== conversation._id) {
      //   socket.emit('mark:conversation-read', setSelectedConversation);
      // }

      return () => {
        socket.off('users:list');
        socket.off('conversation:created');
      }
    };
  
    setUpSocketListeners();
  }, [socket, setSelectedConversation]);

  if (error) {
    return <div className="text-red-500">{error}</div>
  }
  if (!user) {
    return <div className="text-red-500">Please login to view this page</div>
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const formatLastActive = (lastActive) => {
    const date = new Date(lastActive);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const getLastMessage = (recipientId) => {
    socket.emit('get:last-message', recipientId, (message) => {
      if (message) {
        console.log(message);
      } else {
        console.log('No message');
      }
    });
  }

  const createConversation = (user) => {
    setSelectedConversation({
      _id: null,
      participants: {
        _id: user._id,
        name: user.name,
        avatar: user.avatar,
      },
      type: 'private',
    })
    socket.emit('create:conversation', {
      receiverId: user._id,
      content: null,
    });
    // getLastMessage(user._id);
  }
  const formatLasMessage = (user) => {
    const lastMessage = lastMessagesMap[user._id];

    if (!lastMessage) {
      return 'No message';
    }

    if (lastMessage.senderId === user._id) {
      return `You: ${lastMessage.content}`;
    }
    return `${lastMessage.senderName}: ${lastMessage.content}`;
  }
  return (
    <div className="">
      <div className="flex justify-between items-center border-b-2 p-5">
        <h1 className="font-bold text-3xl">Messages</h1>
        <IoIosAddCircle className="text-3xl text-blue-500" />
      </div>

      <div className="p-10">
        <div className="flex">
          <button className="bg-gray-100 rounded-l-lg px-3 hover:bg-gray-200 duration-150 text-gray-400">
            <FaSearch />
          </button>
          <input
            type="text"
            className="bg-gray-100 w-full py-1 px-3 rounded-r-lg outline-none"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="px-8 mb-5 space-y-6">
        {filteredUsers.map((user) => (
          <div
            key={user._id}
            className="flex items-center hover:bg-gray-200 py-2 rounded-lg px-3 cursor-pointer"
            onClick={() => createConversation(user)}
          >
            <div className="relative mr-4">
              <img
                src={user.avatar || img1}
                alt={user.name}
                className="rounded-full w-12 h-12"
              />
              {user.status === 'online' && (
                <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h1 className="font-semibold text-lg">{user.name}</h1>
                <p className="text-xs text-gray-500">
                  {formatLastActive(user.lastActive)}
                </p>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 truncate">
                  {formatLasMessage(user)}
                </p>
                {user.status !== 'online' && (
                  <p className="text-xs text-gray-400">Offline</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default ConvesationList;
