import React, { useCallback, useContext, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Directory from "./components/Directory";
import "../src/styles/index.css";
import ConvesationList from "./components/ConvesationList";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import { AlertContext, AlertProvider } from "./context/AlertMessage";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { UserProvider, useUser } from "./context/UserContext";
import Profile from "./components/Profile";
import { Outlet } from 'react-router-dom';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { motion, AnimatePresence } from 'framer-motion';
import HomePage from "./pages/HomePage";
import Spinner, { SpinnerOverlay } from "./components/Spinner";




const Layout = () => {
  const { isDark } = useTheme();
  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`w-32 shadow-2xl fixed h-full z-40 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <Sidebar />
      </div>
      <div className={`ml-24 flex-1 p-5 h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <Outlet />
      </div>
    </div>
  )
}
const Appcontent = () => {
  const { alertMessage, alertType } = useContext(AlertContext);
  return (
    <>
      {alertMessage && (
        <div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
          <span className="text-center flex justify-center w-full items-center space-x-1 px-5">
            {alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            <p className="text-sm">{alertMessage}</p>
          </span>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route element={<Layout />}>
          <Route path="/home" element= {<HomePage/>}/>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </>
  )
}

const ConditionalThemeWrapper = ({ children }) => {
  const { isDark } = useTheme();
  const location = useLocation();

  const noThemeRoutes = ['/', '/forgot-password', '/reset-password'];

  const shouldApplyTheme = !noThemeRoutes.includes(location.pathname);

  if (!shouldApplyTheme) {
    return <div className="bg-white min-h-screen">{children}</div>;
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className={`${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-black'} min-h-screen transition-colors duration-300`}>
        {children}
      </div>
    </div>
  )
}

const RouteTransitionSpinner = () =>{
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation(); 

  useEffect(() => {
    setIsLoading(true);

    const timer = setTimeout(() =>{
      setIsLoading(false);
    },800)

    return () => clearTimeout(timer);
  }, [location.pathname])

  return (
    <SpinnerOverlay isLoading={isLoading}/>
  )
}
const App = () => {
  return (
    <UserProvider>
      <ThemeProvider>
        <AlertProvider>
          <Router>
            <RouteTransitionSpinner />
            <ConditionalThemeWrapper>
              <Appcontent />
            </ConditionalThemeWrapper>
          </Router>
        </AlertProvider>
      </ThemeProvider>
    </UserProvider>
  );
};


const ChatPage = () => {
  const { user, socket } = useUser();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const location = useLocation();
  const {isDark} = useTheme();

  useEffect(() => {
    const loadInitalData = async () => {
      try {
        setIsLoading(true);

        if (user?._id && socket) {
          if (!socket.connected) {
            await new Promise(resolve => socket.on('connect', resolve));
          }

          await new Promise(resolve => {
            socket.emit('get:conversations', user._id);
            socket.once('conversations:list', (conversationList) => {
              setConversations(conversationList || []);
              resolve();
            })
          })
        }
      } catch (error) {
        console.error('Error loading initial data: ', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitalData();
  }, [user?._id, socket]);

  useEffect(() => {
    if (socket) {

      setIsSocketConnected(socket.connected);

      const handleConnect = () => {
        setIsSocketConnected(true);

        if (user?._id) {
          socket.emit('get:conversations', user._id);
        }
      };

      const handleDisconnect = () => setIsSocketConnected(false);

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
      }
    }
  }, [socket, user?._id]);

  useEffect(() => {
    if (location.state?.conversation) {
      const conversation = location.state.conversation;
      const updatedConversation = {
        ...conversation,
        participants: conversation.participants || []
      };
      setSelectedConversation(updatedConversation);

      if (socket && conversation._id) {
        socket.emit('message:read', conversation._id);
      }
    }
  }, [location.state, socket]);


  useEffect(() => {
    if (!socket) return;

    socket.emit('get:conversations', user._id);
    socket.on('conversations:list', (conversationsList) => {
      setConversations(conversationsList || []);
    });


    socket.on('user:online', (updatedUser) => {
      setSelectedConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          otherParticipant: prev.otherParticipant?._id === updatedUser._id ?
            { ...prev.otherParticipant, ...updatedUser } : prev.otherParticipant,
          participants: prev.participants?.map(p =>
            p._id === updatedUser._id ? { ...p, ...updatedUser } : p
          )
        };
      });
    });

    socket.on('user:offline', (updatedUser) => {
      setSelectedConversation(prev => {
        if (!prev) return null;
        return {
          ...prev,
          otherParticipant: prev.otherParticipant?._id === updatedUser._id ?
            { ...prev.otherParticipant, ...updatedUser } : prev.otherParticipant,
          participants: prev.participants?.map(p =>
            p._id === updatedUser._id ? { ...p, ...updatedUser } : p
          )
        };
      });
    });

    socket.on('conversation:created', (conversation) => {
      setConversations(prevConversations => {
        const exists = prevConversations.some(conv => conv._id === conversation._id);
        if (!exists) {
          return [conversation, ...prevConversations];
        }
        return prevConversations.map(conv => conv._id === conversation._id ? conversation : conv);
      });

      setSelectedConversation(prev => {
        if (!prev || prev._id === conversation._id) {
          return conversation;
        }
        return prev;
      });
    });


    socket.on('conversation:updated', (updatedConversation) => {
      setConversations(prevConversations => {
        return prevConversations.map(conv =>
          conv._id === updatedConversation._id ? updatedConversation : conv
        );
      });

      // Cập nhật selectedConversation nếu đang hiển thị conversation được update
      setSelectedConversation(prev => {
        if (prev && prev._id === updatedConversation._id) {
          return updatedConversation;
        }
        return prev;
      });
    });


    socket.on('friendRequestAccepted', ({ type, conversation }) => {
      if (type === 'friend_request_accepted' && conversation) {
        setConversations(prevConversations => {
          const existingIndex = prevConversations.findIndex(
            conv => conv._id === conversation._id
          );

          if (existingIndex !== -1) {
            const updatedConversations = [...prevConversations];
            updatedConversations[existingIndex] = {
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
      socket.off('conversation:created');
      socket.off('conversations:list');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('friendRequestAccepted');
      socket.off('conversation:updated');
    }
  }, [socket]);

  const handleMessageClick = (conversation) => {
    if (socket && conversation._id) {
      const updatedConversation = {
        ...conversation,
        participants: conversation.participants || []
      };
      socket.emit('message:read', conversation._id);
      setSelectedConversation(updatedConversation);
    }
  }

  const handleGroupUpdate = useCallback((updatedGroup) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv._id === updatedGroup._id) {
          return {
            ...conv,
            ...updatedGroup,
            name: updatedGroup.name || conv.name,
            avatar: updatedGroup.avatarGroup || conv.avatarGroup,
            participants: updatedGroup.participants || conv.participants,

          }
        }
        return conv;
      }).sort((a, b) => {
        const aDate = new Date(a.lastMessage?.createdAt || a.createdAt || 0);
        const bDate = new Date(b.lastMessage?.createdAt || b.createdAt || 0);
        return bDate - aDate;
      })
    )
    setSelectedConversation(prev => {
      if (prev?._id === updatedGroup._id) {
        return {
          ...prev,
          ...updatedGroup,
          name: updatedGroup.name || prev.name,
          avatar: updatedGroup.avatarGroup || prev.avatarGroup,
          participants: updatedGroup.participants || prev.participants,
          updatedAt: new Date(),
          lastMessage: updatedGroup.lastMessage || prev.lastMessage
        }
      }
      return prev;
    })
  }, [])

  useEffect(() => {
    if (!socket || !user?._id) return;

    const handleAddedToGroup = async (groupId) => {

      setConversations(prev => {
        const exists = prev.some(conv => conv._id === groupId);
        if (!exists) {
          return [...prev, groupId].sort((a, b) => {
            const aDate = new Date(a.lastMessage?.createdAt || a.createdAt || 0);
            const bDate = new Date(b.lastMessage?.createdAt || b.createdAt || 0);
            return bDate - aDate;
          })
        }
        return prev;
      })
      // socket.emit('get:conversations', user._id);
    };

    socket.on('group:added', handleAddedToGroup);

    return () => {
      socket.off('group:added', handleAddedToGroup);
    };
  }, [socket, user?._id]);

  useEffect(() => {
    if (!socket) return;

    socket.on('group:updated', handleGroupUpdate);
    socket.on('conversation:updated', (conversation) => {
      handleGroupUpdate(conversation);
    });

    return () => {
      socket.off('group:updated', handleGroupUpdate);
      socket.off('conversation:updated');
    };
  }, [socket, handleGroupUpdate]);

  useEffect(() => {
    if (!socket) return;

    const handleGroupLeave = (groupId) => {
      if (groupId) {
        setConversations(prev => prev.filter(conv => conv._id !== groupId));
        setSelectedConversation(prev => prev?._id === groupId ? null : prev);
      }
    }
    socket.on('group:left', handleGroupLeave);
    socket.on('group:removed', handleGroupLeave);

    return () => {
      socket.off('group:left', handleGroupLeave);
      socket.off('group:removed', handleGroupLeave);
    }
  }, [socket]);


  const EmptyState = () => (
    <div className={`flex flex-col items-center justify-center h-full text-gray-500 space-y-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
      <svg 
        className="w-24 h-24 text-gray-300" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
        />
      </svg>
      <p className="text-xl">Please select a conversation</p>
    </div>
  )

  const ConversationSkeleton = () => {
    <div className="animate-pulse space-y-4 p-4">
      {[1, 2, 3].map((_, index) => (
        <div key={index} className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  }
  const OfflineIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 w-full bg-red-500 text-white text-center py-2 z-50"
    >
      You're offline. Reconnecting...
    </motion.div>
  );

  return (
    <>
      {!isSocketConnected && <OfflineIndicator />}
      <div className="flex h-full space-x-4">
        <div className="w-1/4 bg-white rounded-2xl shadow-lg max-h-full">
          {isLoading ? (
            <ConversationSkeleton />
          ) : conversations?.length > 0 ? (
            <ConvesationList
              className="flex-1"
              setSelectedConversation={setSelectedConversation}
              onMessageClick={handleMessageClick}
              initialSelectedId={location.state?.conversation?._id}
              conversations={conversations}
              setConversations={setConversations}
              currentUser={user}
            />
          ) : (
            <EmptyState />
          )}
        </div>
        <div className="w-2/4 bg-white rounded-2xl shadow-lg">
          <AnimatePresence>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Spinner size="large" color="text-blue-500" />
              </div>
            ) : selectedConversation ? (
              // <motion.div
              //   initial={{ opacity: 0 }}
              //   animate={{ opacity: 1 }}
              //   transition={{ duration: 0.3 }}
              // >
              <ChatWindow
                conversation={selectedConversation}
                currentUser={user}
              />
              // </motion.div>
            ) : (
              <EmptyState />
            )}
          </AnimatePresence>
        </div>
        <div className="w-1/4 bg-white rounded-2xl shadow-lg h-full flex flex-col">
          {isLoading ? (
            <ConversationSkeleton />
          ) : (
            <Directory
              selectedConversation={selectedConversation}
              socket={socket}
              setSelectedConversation={setSelectedConversation}
            />
          )}
        </div>
        {/* )} */}
      </div>
    </>
  )
}

export default App;
