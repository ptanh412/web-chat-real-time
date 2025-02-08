import React, { useEffect, useState, useContext, useCallback, useRef } from "react";
import { IoIosAddCircle, IoIosSearch } from "react-icons/io";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { useUser } from "../context/UserContext";
import { FaSearch } from "react-icons/fa";
import { FiUserPlus } from "react-icons/fi";
import { AiOutlineUsergroupAdd } from "react-icons/ai";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";
import { useTheme } from "../context/ThemeContext";
import SearchableConversations from "./SearchableConversations ";


const ConvesationList = ({
  setSelectedConversation,
  conversations,
  setConversations,
  currentUser,
}) => {
  const { showAlert } = useContext(AlertContext);

  // const [conversations, setConversations] = useState([]);
  const { user, socket } = useUser();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showListFriend, setShowListFriend] = useState(false);
  const [friends, setFriends] = useState([]);
  const [addFriends, setAddFriends] = useState([]);
  const [friendIds, setFriendIds] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const { isDark } = useTheme();

  const dropdownRef = useRef(null);

  const [currentConversationId, setCurrentConversationId] = useState(null);

  useEffect(() => {
    if (setSelectedConversation) {
      setCurrentConversationId(setSelectedConversation._id);
    }
  }, [setSelectedConversation]);


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowAdd(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [])

  useEffect(() => {
    if (!socket) return;

    socket.on('friendRequestAccepted', (data) => {
      const { conversation, type } = data;

      if (conversation && type === 'friend_request_accepted') {
        setConversations(prevConversations => {
          const exists = prevConversations.findIndex(
            conv => conv._id === conversation._id
          );
          if (exists !== -1) {
            const updatedConversations = [...prevConversations];
            updatedConversations[exists] = {
              ...conversation,
              isFriendshipPending: false,
              friendRequestStatus: 'none'
            };
            return updatedConversations;
          }
          return [conversation, ...prevConversations];
        });

        setSelectedConversation(conversation);
      }
    });
    return () => {
      socket.off('friendRequestAccepted');
    }
  }, [socket, setSelectedConversation, setConversations]);


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

  const handleUserStatusChange = useCallback((user) => {
    setConversations(prevConversations =>
      prevConversations.map(conv => {
        if (conv.type === 'private' && conv.otherParticipant?._id === user._id) {
          return {
            ...conv,
            otherParticipant: { ...conv.otherParticipant, ...user }
          };
        }
        return conv;
      })
    );
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('user:online', handleUserStatusChange);
    socket.on('user:offline', handleUserStatusChange);

    return () => {
      socket.off('user:online', handleUserStatusChange);
      socket.off('user:offline', handleUserStatusChange);
    };
  }, [socket, handleUserStatusChange]);

  const handleConversationClick = (conversation) => {
    if (!socket || !conversation._id) return;

    if (conversation.type === 'group') {
      socket.emit('message:read', {
        conversationId: conversation._id,
        userId: user._id
      });
    } else {
      socket.emit('message:read', conversation._id);
    }

    setConversations(prev =>
      prev.map(conv => {
        if (conv._id === conversation._id) {
          const updatedConversation = { ...conv };

          if (conv.type === 'group') {
            updatedConversation.participantUnreadCount = {
              ...conv.participantUnreadCount,
              [user._id]: 0
            };
          } else {
            updatedConversation.unreadCount = 0;
          }

          if (updatedConversation.lastMessage) {
            const existingReadBy = updatedConversation.lastMessage.readBy || [];
            const hasUserRead = existingReadBy.some(r => r.user === user._id);

            if (!hasUserRead) {
              updatedConversation.lastMessage = {
                ...updatedConversation.lastMessage,
                readBy: [
                  ...existingReadBy,
                  { user: user._id, readAt: new Date() }
                ]
              };
            }
          }
          return updatedConversation;
        }
        return conv;
      })
    )
    setSelectedConversation(conversation);
    setCurrentConversationId(conversation._id);
  }

  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleStatusUpdate = (updatedMessages) => {
      setConversations(prevConversations => 
        prevConversations.map(conv => {
          const relevantMessage = updatedMessages.find(msg => 
            msg.conversationId === conv._id
          );
          
          if (relevantMessage) {
            return {
              ...conv,
              lastMessage: conv.lastMessage?._id === relevantMessage._id 
                ? {
                    ...conv.lastMessage,
                    readBy: relevantMessage.readBy,
                    status: relevantMessage.status
                  }
                : conv.lastMessage,
              participantUnreadCount: conv.type === 'group' 
                ? { ...conv.participantUnreadCount, [user._id]: 0 }
                : conv.participantUnreadCount,
              unreadCount: conv.type === 'group' ? conv.unreadCount : 0
            };
          }
          return conv;
        })
      );
    }
    // Listen for message status updates
    socket.on('message:status-updated', handleStatusUpdate);


    return () => {
      socket.off('message:status-updated');
    };
  }, [socket, user?._id, setSelectedConversation]);



  useEffect(() => {
    if (!socket || !user?._id) {
      return;
    };

    const formatConversation = (conversation) => {
      const formatted = {
        _id: conversation._id,
        type: conversation.type,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants?.map(p => ({
          _id: p._id,
          name: p.name,
          avatar: p.avatar,
          status: p.status,
          lastActive: p.lastActive
        })),
        unreadCount: conversation.unreadCount || 0
      };

      if (conversation.lastMessage) {
        const personalizedMsg = conversation.lastMessage.personalizedContent?.find(
          pc => pc.userId.toString() === user._id.toString()
        );

        formatted.lastMessage = {
          ...conversation.lastMessage,
          content: personalizedMsg?.content || conversation.lastMessage.content,
        }
      }

      if (conversation.type === 'group') {
        return {
          ...formatted,
          name: conversation.name,
          avatarGroup: conversation.avatarGroup,
          creator: conversation.creator,
          unreadCount: conversation.participantUnreadCounts?.[user._id] || 0,
          lastMessage: conversation.lastMessage ? {
            ...conversation.lastMessage,
            readBy: conversation.lastMessage.readBy || []
          } : null
        };
      }

      if (conversation.type === 'private' && conversation.otherParticipant) {
        return {
          ...formatted,
          otherParticipant: {
            _id: conversation.otherParticipant._id,
            name: conversation.otherParticipant.name,
            avatar: conversation.otherParticipant.avatar,
            status: conversation.otherParticipant.status,
            lastActive: conversation.otherParticipant.lastActive
          }
        };
      }

      return formatted;
    };
    socket.emit('get:conversations', user._id);

    socket.on('conversations:list', (conversationList) => {
      const formattedConversations = conversationList.map(formatConversation);
      const sortedConversations = formattedConversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
        const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
        return new Date(bTime) - new Date(aTime);
      })
      setConversations(sortedConversations);
    });

    const handleNewConversation = (data) => {
      const { conversation } = data;
      if (conversation) {
        setConversations(prev => {
          const filter = prev.filter(conv => conv._id !== conversation._id);
          return [formatConversation(conversation), ...filter];
        });
      }
    };


    socket.on('conversation:created', handleNewConversation);


    socket.on('new:message', (newMessage) => {
      setConversations(prevConversations => {
        const updatedConvs = prevConversations.map(conv => {
          if (conv._id === newMessage.conversationId) {
            const isSender = newMessage.sender._id === user._id;
            const isCurrentView = conv._id === currentConversationId;

            const personalizedMsg = newMessage.personalizedContent?.find(
              pc => pc.userId.toString() === user._id.toString()
            )

            const messageContent = personalizedMsg?.content || newMessage.content;

            if (conv.type === 'group') {
              const updatedConv = {
                ...conv,
                lastMessage: {
                  ...newMessage,
                  content: messageContent,
                  sender: {
                    _id: newMessage.sender._id,
                    name: newMessage.sender.name,
                    avatar: newMessage.sender.avatar
                  },
                  readBy: isCurrentView || isSender ?
                    [...(newMessage.readBy || []), { user: user._id, readAt: new Date() }] :
                    newMessage.readBy
                },
                updatedAt: new Date(newMessage.createdAt || newMessage.sentAt),
              }

              if (!isSender || isCurrentView) {
                updatedConv.participantUnreadCount = {
                  ...conv.participantUnreadCount,
                  [user._id]: (conv.participantUnreadCount?.[user._id] || 0) + 1
                };
              }
              return updatedConv;
            }
            return {
              ...conv,
              lastMessage: {
                ...newMessage,
                content: messageContent,
                sender: {
                  _id: newMessage.sender._id,
                  name: newMessage.sender.name,
                  avatar: newMessage.sender.avatar
                },
                readBy: isCurrentView || isSender ?
                  [...(newMessage.readBy || []), { user: user._id, readAt: new Date() }] :
                  newMessage.readBy
              },
              unreadCount: (!isSender && !isCurrentView) ? (conv.unreadCount || 0) + 1 : 0,
              updatedAt: new Date(newMessage.createdAt || newMessage.sentAt),
            }


          }
          return conv;
        });
        return updatedConvs.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
          const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
          return new Date(bTime) - new Date(aTime);
        });
      });
    });

    const handleMessageRecall = ({ messageId, recallType, message, sender, originalContent }) => {
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.lastMessage?._id === messageId) {
            const updatedConversation = { ...conv };

            const unreadStatus = conv.type === 'group'
              ? conv.participantUnreadCount?.[user._id] || 0
              : conv.unreadCount || 0;

            const updatedLastMessage = {
              ...conv.lastMessage,
              ...message,
              _id: messageId,
              isRecalled: true,
              recallType,
              content: recallType === 'everyone'
                ? (sender._id === user._id ? 'You have recalled a message' : `${sender.name} has recalled a message`)
                : (recallType === 'self' && sender._id === user._id)
                  ? 'You have recalled a message'
                  : originalContent,
              sender: {
                _id: message.sender._id || sender._id,
                name: message.sender.name || sender.name,
                avatar: message.sender.avatar || sender.avatar,
                status: message.sender.status || sender.status,
                lastActive: message.sender.lastActive || sender.lastActive
              }
            }
            if (conv.type === 'private') {
              const otherUser = conv.otherParticipant;
              updatedConversation.otherParticipant = {
                _id: otherUser._id,
                name: otherUser.name,
                avatar: otherUser.avatar,
                status: otherUser.status,
                lastActive: otherUser.lastActive
              };
              updatedConversation.unreadCount = unreadStatus;
            }

            if (conv.type === 'group') {
              updatedConversation.name = conv.name;
              updatedConversation.avatarGroup = conv.avatarGroup;

              updatedConversation.participantUnreadCount = {
                ...conv.participantUnreadCount,
                [user._id]: unreadStatus
              }
            }
            return {
              ...updatedConversation,
              lastMessage: updatedLastMessage,
              updatedAt: new Date()
            }
          }
          return conv;
        }).sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
          const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
          return new Date(bTime) - new Date(aTime);
        });
      });
    };

    const handleConversationUpdate = (updatedConversation) => {
      setConversations(prev => {

        return prev.map(conv => {

          if (conv._id === updatedConversation._id) {
            const updatedConv = {
              ...conv,
              ...updatedConversation,
              participants: updatedConversation.participants || conv.participants,
              lastMessage: updatedConversation.lastMessage ? {
                ...updatedConversation.lastMessage,
                sender: {
                  _id: updatedConversation.lastMessage?.sender?._id || conv.lastMessage?.sender?._id,
                  name: updatedConversation.lastMessage?.sender?.name || conv.lastMessage?.sender?.name,
                  avatar: updatedConversation.lastMessage?.sender?.avatar || conv.lastMessage?.sender?.avatar,
                  status: updatedConversation.lastMessage?.sender?.status || conv.lastMessage?.sender?.status,
                  lastActive: updatedConversation.lastMessage?.sender?.lastActive || conv.lastMessage?.sender?.lastActive
                }
              } : conv.lastMessage,
            };
            if (conv.type === 'private' && conv.otherParticipant) {
              updatedConv.otherParticipant = conv.otherParticipant;
            }
            return updatedConv;
          }
          return conv;
        }).sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
          const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
          return new Date(bTime) - new Date(aTime);
        });
      });
    };
    socket.on('message:recalled', handleMessageRecall);
    socket.on('conversation:updated', handleConversationUpdate);

    return () => {
      socket.off('conversations:list');
      socket.off('conversation:created', handleNewConversation);
      socket.off('conversation:updated', handleConversationUpdate);
      socket.off('new:message');
      socket.off('message:recalled', handleMessageRecall);
    }

  }, [socket, user?._id, setSelectedConversation]);


  const handleGroupUpdate = (updatedGroup) => {
    if (updatedGroup._id === conversations?._id) {
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === updatedGroup._id) {
            return {
              ...conv,
              ...updatedGroup,
              name: updatedGroup.name || conv.name,
              avatarGroup: updatedGroup.avatarGroup || conv.avatarGroup,
              participants: updatedGroup.participants || conv.participants,
              updatedAt: new Date(),
            };
          }
          return conv;
        });
      });
    }
  };

  useEffect(() => {
    if (!socket) return;
    socket.on('group:updated', handleGroupUpdate);
    return () => {
      socket.off('group:updated', handleGroupUpdate);
    };
  }, [socket, setConversations]);


  useEffect(() => {
    if (!socket || !user) return;

    const handleGroupRemove = (groupId) => {
      setConversations(prev =>
        prev.filter(conv => conv._id !== groupId)
      )
      setSelectedConversation(current => current?._id === groupId ? null : current);
    };


    socket.on('group:remove', handleGroupRemove);
    socket.on('group:left', handleGroupRemove);

    return () => {
      socket.off('group:remove', handleGroupRemove);
      socket.off('group:left', handleGroupRemove);
    }
  }, [socket, user]);

  const handleAddFriend = (friendId) => {
    if (socket) {
      socket.emit('sendFriendRequest', {
        requesterId: currentUser._id,
        recipientId: friendId,
      });

      socket.on('friendRequestSent', (data) => {
        setAddFriends((prev) => [...prev, friendId]);
        showAlert("Friend request sent successfully!", "success");
      });
    }
  };

  // Cleanup socket listeners when component unmounts or when socket changes
  useEffect(() => {
    if (socket) {
      return () => {
        socket.off('friendRequestSent');
        socket.off('friendRequestError');
      };
    }
  }, [socket]);

  if (error) {
    return <div className="text-red-500">{error}</div>
  }
  if (!user) {
    return <div className="text-red-500">Please login to view this page</div>
  }

  const formatLastActive = (lastActive) => {
    if (!lastActive) return 'Unknown';
    const date = new Date(lastActive);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const formatLastMessage = (conversation) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return { content: 'No message', isUnread: false, isSender: false };

    const isSender = lastMessage.sender?._id === user?._id;

    const isRead = lastMessage.readBy?.some(r => r.user === user._id) || isSender;
    const isUnread = !isSender && !isRead;

    // Format nội dung tin nhắn
    let content = '';
    if (lastMessage.type === 'system') {
      content = lastMessage.content;
    } else if (lastMessage.isRecalled) {
      content = lastMessage.recallType === 'everyone'
        ? (lastMessage.sender._id === user._id ? 'You have recalled a message' : `${lastMessage.sender.name} has recalled a message`)
        : (lastMessage.recallType === 'self' && lastMessage.sender._id === user._id
          ? 'You have recalled a message'
          : `${lastMessage.content}`);
    } else if (lastMessage.type === 'multimedia') {
      content = lastMessage.attachments?.some(a => a.fileType === 'image')
        ? `${isSender ? 'You' : lastMessage.sender.name} sent a photo`
        : `${isSender ? 'You' : lastMessage.sender.name} sent a file`;
    } else {
      content = `${isSender ? 'You' : lastMessage.sender?.name}: ${lastMessage.content}`;
    }

    return { content, isUnread, isSender };
  };

  const handleBtnAddClick = (e) => {
    e.preventDefault();
    setShowAdd(!showAdd);
    if (!showAdd) {
      setShowListFriend(false);
      setShowCreateGroup(false);
    }
  }
  const handleListFriend = () => {
    setShowListFriend(true);
    setShowAdd(false);
  }
  const handleShowCreateGroup = () => {
    setShowCreateGroup(true);
    setShowAdd(false);
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
    }, (response) => {
      if (response && response.conversation) {
        const newConversation = {
          _id: response.conversation._id,
          type: 'group',
          name: groupName,
          participants: [
            {
              _id: user._id,
              name: user.name,
              avatar: user.avatar,
              status: user.status,
              lastActive: user.lastActive
            },
            ...selectedMembers
          ],
          lastMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: user._id,
          avatarGroup: 'https://res.cloudinary.com/doruhcyf6/image/upload/v1733975023/Pngtree_group_avatar_icon_design_vector_3667776_xq0dzv.png'
        }

        setConversations(prev => [...prev, newConversation].sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.updatedAt || new Date(0);
          const bTime = b.lastMessage?.createdAt || b.updatedAt || new Date(0);
          return new Date(bTime) - new Date(aTime);
        }));

        setSelectedConversation(newConversation);

        showAlert("Group created successfully", "success");
      } else if (response && response.error) {
        showAlert(response.error, "error");
      }
    });

    setShowCreateGroup(false);
    setGroupName('');
    setSelectedMembers([]);
  }

  const handleSendMessage = (receiver) => {
    if (socket && receiver) {
      socket.emit('create:conversation', {
        receiverId: receiver._id,
        userId: user._id,
        content: null,
      }, (newConversation) => {
        setConversations(prev => {
          const exists = prev.findIndex(conv => conv._id === newConversation._id);

          if (exists !== -1) {
            const updatedConversations = [...prev];
            updatedConversations.splice(exists, 1);
            return [newConversation, ...updatedConversations];
          } else {
            return [newConversation, ...prev];
          }
        })
        setSelectedConversation(newConversation);
        setShowListFriend(false);
      });
    }
  }

  return (
    <div className={`z-0 rounded-xl h-full flex flex-col ${isDark ? "bg-gray-800" : "bg-white"}`}>
      <div className="flex justify-between items-center p-5">
        <h1 className="font-bold text-3xl">Messages</h1>
        <IoIosAddCircle
          className="text-3xl text-blue-500"
          onClick={handleBtnAddClick}
          onBlur={() => setShowAdd(false)}
        />
        {showAdd && (
          <div
            ref={dropdownRef}
            className={`absolute top-20 left-[400px] shadow-xl rounded-lg w-60 h-fit z-50 ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <button className={`flex items-center space-x-2 mb-3 p-2 w-full hover:rounded-t-lg ${isDark ? "hover:bg-gray-500 rounded-t-lg" : "hover:bg-gray-200"}`} onClick={handleListFriend}>
              <FiUserPlus
                className="text-xl text-blue-500"
              />
              <span className="font-semibold">Add friend</span>
            </button>

            <button className={`flex items-center space-x-2 hover:rounded-b-lg w-full p-2 ${isDark ? "hover:bg-gray-500 rounded-b-lg" : "hover:bg-gray-200"}`} onClick={handleShowCreateGroup}>
              <AiOutlineUsergroupAdd className="text-xl text-blue-500" />
              <span className="font-semibold">Create group</span>
            </button>
          </div>
        )}
        {showListFriend && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className={`p-6 rounded-lg w-[500px] ${isDark ? "rounded-t-lg bg-gray-800" : "bg-white"}`}>
              <div className="flex items-center">
                <input
                  type="text"
                  className={`bg-gray-200 w-full rounded-l-lg outline-none text-sm h-5 px-3 placeholder-transparent py-3 ${isDark ? "text-white bg-gray-600" : "text-black"}`}
                  placeholder="Search friend"
                />
                <IoIosSearch className={`rounded-r-lg  transition-colors duration-300 h-6 w-5 text-gray-500 ${isDark ? "bg-gray-600 hover:bg-gray-700" : "hover:bg-slate-200 bg-gray-200 "}`} />
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
                      <button
                        className="bg-blue-500 hover:bg-blue-300 transition-colors duration-300 text-white rounded-lg px-2 text-sm font-semibold"
                        onClick={() => handleSendMessage(user)}
                      >
                        Send message
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="bg-red-500 text-white w-fit text-center rounded-lg font-semibold px-14 py-1 text-base ml-40  mt-5 hover:bg-red-400 transition-colors duration-300" onClick={() => setShowListFriend(false)}>Close</button>
            </div>
          </div>
        )}
        {showCreateGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`p-6 rounded-lg w-96 ${isDark ? "bg-gray-800 rounded-t-lg " : "bg-white"}`}>
              <h2 className="text-xl font-bold mb-4">Create Group Conversation</h2>
              <input
                type="text"
                placeholder="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className={`w-full p-2 border rounded mb-4 ${isDark ? "bg-gray-600 text-white" : "bg-gray-100"}`}
              />

              <h3 className="font-semibold mb-2">Select Group Members</h3>
              <div className="max-h-64 overflow-y-auto">
                {friends.filter(u => u._id !== friends._id).map((member) => (
                  <div
                    key={member._id}
                    className={`flex items-center p-2 mb-5 rounded-lg ${isDark ? "hover:bg-gray-500" : "hover:bg-gray-100"} cursor-pointer ${selectedMembers.some(m => m._id === member._id)
                      ? isDark ? "bg-gray-700" : "bg-blue-100"
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

              <div className="flex justify-end space-x-2 mt-4 text-white font-semibold">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 bg-red-500 rounded"
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

      <div className="p-10">
        <SearchableConversations
          conversations={conversations}
          setSelectedConversation={setSelectedConversation}
          isDark={isDark}
        // searchTerm={searchTerm}
        // setSearchTerm={setSearchTerm}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="px-8 h-full overflow-y-auto scrollbar-thin scrollbar-track-transparent  transition-colors duration-300">
          <div className="space-y-6 py-5">
            {conversations.map((conversation) => {
              const messageInfo = formatLastMessage(conversation);
              const isCurrentConversation = conversation._id === currentConversationId;

              const showUnreadCount = (conversation) => {
                const isCurrentConversation = conversation._id === currentConversationId;

                if (isCurrentConversation) return false;

                if (conversation.type === 'group') {
                  return (conversation.participantUnreadCount?.[user._id] || 0) > 0;
                }

                return (conversation.unreadCount || 0) > 0;
              }

              const unreadCount = conversation.type === 'group'
                ? conversation.participantUnreadCount?.[user._id] || 0
                : conversation.unreadCount || 0;
              return (
                <div
                  key={conversation._id}
                  className={`${conversation._id === currentConversationId ? isDark ? 'bg-gray-700' : 'bg-gray-200' : ''} flex items-center py-2 rounded-lg px-3 cursor-pointer ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"} transition-colors duration-150`}
                  onClick={() => handleConversationClick(conversation)}
                >
                  <div className="relative mr-4">
                    {conversation.type === 'group' ? (
                      <div className="relative">
                        <img
                          src={conversation.avatarGroup || img1}
                          alt={conversation.name}
                          className="rounded-full w-12 h-12"
                        />
                        {showUnreadCount(conversation) && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {conversation.type === 'group'
                              ? conversation.participantUnreadCount?.[user._id] || 0
                              : conversation.unreadCount || 0
                            }
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={conversation.otherParticipant?.avatar || img1}
                          alt={conversation.otherParticipant?.name}
                          className="rounded-full w-12 h-12"
                        />
                        {showUnreadCount(conversation) && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                            {conversation.type === 'group'
                              ? conversation.participantUnreadCount?.[user._id] || 0
                              : conversation.unreadCount || 0
                            }
                          </span>
                        )}
                        {conversation.otherParticipant?.status === 'online' && (
                          <span className="absolute bottom-0 right-0 block w-3 h-3 bg-green-500 rounded-full border-white border-2"></span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h1 className={`text-lg truncate ${messageInfo.isUnread ? 'font-bold' : ''
                        }`}>
                        {conversation.type === 'group'
                          ? conversation.name
                          : conversation.otherParticipant?.name
                        }
                      </h1>
                      <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {conversation.lastMessage
                          ? formatLastActive(conversation.lastMessage.createdAt)
                          : formatLastActive(conversation.createdAt)
                        }
                      </p>
                    </div>

                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate max-w-[180px] ${messageInfo.isUnread
                        ? isDark ? 'text-white font-bold' : 'text-black font-bold'
                        : messageInfo.isSender
                          ? 'text-gray-500'
                          : 'text-gray-500'
                        }`}>
                        {messageInfo.content}
                      </p>
                      {conversation.type !== 'group' && conversation.otherParticipant?.status !== 'online' && (
                        <p className="text-xs text-gray-400">Offline</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {conversations.length === 0 && (
              <div className="text-center text-gray-500">
                No conversation
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConvesationList;
