import React, { useEffect, useState, useContext, useCallback } from "react";
import { IoIosAddCircle, IoIosSearch } from "react-icons/io";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { useUser } from "../context/UserContext";
import { FaSearch } from "react-icons/fa";
import { FiUserPlus } from "react-icons/fi";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";


const ConvesationList = ({ setSelectedConversation }) => {
  const { showAlert } = useContext(AlertContext);
  const [conversations, setConversations] = useState([]);
  const { user, socket } = useUser();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showListFriend, setShowListFriend] = useState(false);
  const [friends, setFriends] = useState([]);
  const [addFriends, setAddFriends] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);


  useEffect(() => {
    const getUnfriends = async () => {
      if (!user) return; // Additional guard clause
      try {
        const response = await axios.get(`http://localhost:5000/api/friends/unfriend`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });
        setUsers(response.data.data || []);
      } catch (error) {
        console.log("Get users failed: ", error);
      }
    };
    const getFriendList = async () => {
      if (!user) return; // Additional guard clause
      try {
        const response = await axios.get(`http://localhost:5000/api/friends/friendList`, {
          headers: {
            Authorization: `Bearer ${user.token}`,
          }
        });
        setFriends(response.data.data || []);

        const acceptedFriendIds = response.data.data.filter(
          friendship => friendship.status === 'accepted'
        ).map(friendship =>
          friendship.requester._id === user._id
            ? friendship.recipient._id
            : friendship.requester._id
        )
        setFriendIds(acceptedFriendIds);
      } catch (error) {
        console.log("Get friends failed: ", error);
      }
    }
    getFriendList();
    getUnfriends();
  }, [user?.token]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('get:conversations', user._id);

    socket.on('conversations:list', (conversationList) => {

      const validConversations = conversationList.filter((conv) =>
        conv.type === 'group' ||
        (conv.type === 'private' && friendIds.includes(conv.otherParticipant._id))
      );
      setConversations(validConversations || []);
    });

    socket.on('conversation:created', (conversation) => {

      const isValidConversation = cov => cov.type === 'group' || (
        conversation.otherParticipant && friendIds.includes(conversation.otherParticipant._id)
      )
      if (!isValidConversation) {
        setConversations(prevConversations => {
          // Check if conversation already exists
          const existingConversation = prevConversations.find(
            conv => conv._id === conversation._id
          );

          if (existingConversation) {
            return prevConversations.map(conv =>
              conv._id === conversation._id ? conversation : conv
            );
          }
          return [...prevConversations, conversation].sort((a, b) => {
            const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt) : new Date(0);
            const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt) : new Date(0);
            return bTime - aTime;
          });
        });

        setSelectedConversation(conversation);
      }
    });
    socket.on('conversation:updated', (updatedConversation) =>{
      
      setConversations(prevConversations => {
        return prevConversations.map(conv =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        );
      });
    })

    socket.on('new:message', (newMessage) => {
      console.log('Conversation Id:', newMessage.conversationId);
      console.log('New message:', newMessage);
      setConversations(prevConversations => {
        // Tìm conversation chứa tin nhắn mới
        const updatedConvs = prevConversations.map(conv => 
          conv._id === newMessage.conversationId
          ? {
              ...conv,
              lastMessage: newMessage,
              updatedAt: new Date()
            }
          : conv
        );

        // Sắp xếp lại danh sách conversation
        return updatedConvs.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
          const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
          return new Date(bTime) - new Date(aTime);
        });
      });
    });

    socket.on('friendRequestError', (error) => {
      console.log('Friend request error:', error);
      setAddFriends((prev) => prev.filter((id) => id !== error.friendId));
    })

    return () => {
      socket.off('conversations:list');
      socket.off('conversation:created');
      socket.off('conversation:updated');
      socket.off('new:message');
      socket.off('friendRequestError');
    }
  }, [socket, user, friendIds, setSelectedConversation]);

  const handleAddFriend = (friendId) => {
    if (socket && user) {
      socket.emit('sendFriendRequest', {
        requesterId: user._id,
        recipientId: friendId,
      })
      setAddFriends((prev) => [...prev, friendId]);
    }
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }
  if (!user) {
    return <div className="text-red-500">Please login to view this page</div>
  }

  const filteredConversations = conversations.filter((conv) => {
    const name = conv.type === 'group'
      ? conv.name
      : conv.otherParticipant?.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });


  const formatLastActive = (lastActive) => {
    if (!lastActive) return 'Unknown';
    const date = new Date(lastActive);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const formatLastMessage = (conversation) => {
    
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) {
      return 'No message';
    }

    if (lastMessage.sender._id === user._id) {
      if (lastMessage.type === 'multimedia') {
        if (lastMessage.attachments?.some((a) => a.fileType === 'image')) {
          return `You sent a photo`;
        } else if (lastMessage.attachments?.some((a) => a.fileType === 'raw')) {
          return `You sent a file`;
        }
      } else {
        return `You: ${lastMessage.content}`;
      }
    } else if (lastMessage.sender._id !== user._id) {
      if (lastMessage.type === 'multimedia') {
        if (lastMessage.attachments?.some((a) => a.fileType === 'image')) {
          return `${lastMessage.sender.name} sent a photo`;
        } else if (lastMessage.attachments?.some((a) => a.fileType === 'raw')) {
          return `${lastMessage.sender.name} sent a file`;
        }
      } else {
        return `${lastMessage.sender.name}: ${lastMessage.content}`;
      }
    }
    return `${lastMessage.sender.name}: ${lastMessage.content}`;
  }

  const handleBtnAddClick = (e) => {
    e.preventDefault();
    setShowAdd(!showAdd);
    if (showAdd) {
      setShowListFriend(true);
    } else {
      setShowListFriend(false);
    }
  }
  const handleListFriend = () => {
    setShowListFriend(!showListFriend);
  }
  const handleShowCreateGroup = () => {
    setShowCreateGroup(!showCreateGroup);
  }

  const handleGroupMemberToggle = (member) => {
    setSelectedMembers(prev =>
      prev.some(selectedMember => selectedMember._id === member._id)
        ? prev.filter(selectedMember => selectedMember._id !== member._id)
        : [...prev, member]
    )
  }

  const handleCreateGroup = () => {

    if (!groupName.trim()) {
      showAlert("Group name is required", "error");
      return;
    }
    console.log(selectedMembers);
    if (selectedMembers.length < 1) {
      showAlert("Group must have at least 2 members", "error");
      return;
    }

    socket.emit('create:group-conversation', {
      name: groupName,
      participants: [
        user._id,
        ...selectedMembers.map(member => member._id)
      ],
    });

    setShowCreateGroup(false);
    setGroupName('');
    setSelectedMembers([]);
  }

  return (
    <div className="z-0 rounded-xl">
      <div className="flex justify-between items-center p-5">
        <h1 className="font-bold text-3xl">Messages</h1>
        <IoIosAddCircle
          className="text-3xl text-blue-500"
          onClick={handleBtnAddClick}
          onBlur={() => setShowAdd(false)}
        />
        {showAdd && (
          <div className="absolute top-20 left-[330px] bg-white shadow-xl rounded-lg w-60 h-fit">
            <button className="flex items-center space-x-2 mb-3 p-2 hover:bg-slate-200 w-full hover:rounded-t-lg" onClick={handleListFriend}>
              <FiUserPlus
                className="text-xl text-blue-500"
              />
              <span className="font-semibold">Add friend</span>
            </button>
            {showListFriend && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999px">
                <div className="bg-white p-6 rounded-lg w-96">
                  <div className="flex items-center">
                    <input
                      type="text"
                      className="bg-gray-200 w-full rounded-l-lg outline-none text-sm h-5 px-3 placeholder-transparent py-3"
                      placeholder="Search friend"
                    />
                    <IoIosSearch className="bg-gray-200 rounded-r-lg hover:bg-slate-200 transition-colors duration-300 h-6 w-5 text-gray-500" />
                  </div>
                  <p className="mt-2 font-bold text-sm">Suggestion</p>
                  <ul className=" space-y-5 mt-3 flex-1">
                    {Array.isArray(users) && users.map((user) => (
                      <li className="flex justify-between items-center">
                        <div className="flex justify-between space-x-3 items-center">
                          <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full" />
                          <p className="text-sm font-semibold">{user.name}</p>
                        </div>
                        <div className="space-x-3">
                          <button
                            className={`text-white rounded-lg px-2 text-sm font-semibold ${addFriends.includes(user._id)
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-red-400 hover:bg-red-300 transition-colors duration-300"
                              }`}
                            onClick={() => handleAddFriend(user._id)}
                            disabled={addFriends.includes(user._id)}
                          >
                            {addFriends.includes(user._id) ? "Request sent" : "Add friend"}
                          </button>
                          <button className="bg-blue-500 hover:bg-blue-300 transition-colors duration-300 text-white rounded-lg px-2 text-sm font-semibold">Send message</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button className="bg-red-500 text-white w-fit text-center rounded-lg font-semibold px-3 text-base ml-36 mt-5 hover:bg-red-400 transition-colors duration-300" onClick={handleListFriend}>Close</button>
                </div>
              </div>
            )}
            <button className="flex items-center space-x-2 hover:bg-slate-200 hover:rounded-b-lg w-full p-2" onClick={handleShowCreateGroup}>
              <AiOutlineUsergroupAdd className="text-xl text-blue-500" />
              <span className="font-semibold">Create group</span>
            </button>
            {showCreateGroup && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg w-96">
                  <h2 className="text-xl font-bold mb-4">Create Group Conversation</h2>

                  <input
                    type="text"
                    placeholder="Group Name"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full p-2 border rounded mb-4"
                  />

                  <h3 className="font-semibold mb-2">Select Group Members</h3>
                  <div className="max-h-64 overflow-y-auto">
                    {friends.filter(u => u._id !== friends._id).map((member) => (
                      <div
                        key={member._id}
                        className={`flex items-center p-2 hover:bg-gray-100 cursor-pointer ${selectedMembers.some(m => m._id === member._id)
                          ? 'bg-blue-100'
                          : ''
                          }`}
                        onClick={() => handleGroupMemberToggle(member)}
                      >
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                        <span>{member.name}</span>
                        {selectedMembers.some(m => m._id === member._id) && (
                          <span className="ml-auto text-green-500">✓</span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <button
                      onClick={() => setShowCreateGroup(false)}
                      className="px-4 py-2 bg-gray-200 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateGroup}
                      className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                      Create Group
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
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

      <div className="px-8 mb-5 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
        {filteredConversations.map((conversation) => (
          <div
            key={conversation._id}
            className="flex items-center hover:bg-gray-200 py-2 rounded-lg px-3 cursor-pointer"
            onClick={() => setSelectedConversation(conversation)}
          >
            <div className="relative mr-4">
              {conversation.type === 'group' ? (
                <img
                  src={conversation.avatarGroup || img1}
                  alt={conversation.name}
                  className="rounded-full w-12 h-12"
                />
              ) : (
                <div className="relative">
                  <img
                    src={conversation.otherParticipant?.avatar || img1}
                    alt={conversation.otherParticipant?.name}
                    className="rounded-full w-12 h-12"
                  />
                  {conversation.otherParticipant?.status === 'online' && (
                    <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 rounded-full border-white border-2"></span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h1 className="font-semibold text-lg">
                  {conversation.type === 'group'
                    ? conversation.name
                    : conversation.otherParticipant?.name
                  }
                </h1>
                <p className="text-xs text-gray-500">
                  {conversation.lastMessage
                    ? formatLastActive(conversation.lastMessage.createdAt)
                    : formatLastActive(conversation.createdAt)
                  }
                </p>
              </div>

              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 truncate">
                  {conversation.lastMessage
                    ? formatLastMessage(conversation)
                    : 'No message yet'
                  }
                </p>
                {conversation.type !== 'group' && conversation.otherParticipant?.status !== 'online' && (
                  <p className="text-xs text-gray-400">Offline</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {filteredConversations.length === 0 && (
          <div className="text-center text-gray-500">
            No conversation
          </div>
        )}
      </div>

    </div>
  );
};

export default ConvesationList;
