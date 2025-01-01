import React, { useContext, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Directory from "./components/Directory";
import Files from "./components/Files";
import "../src/styles/index.css";
import ConvesationList from "./components/ConvesationList";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import { AlertContext, AlertProvider } from "./context/AlertMessage";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { UserProvider, useUser } from "./context/UserContext";
import Profile from "./components/Profile";
import { Outlet } from 'react-router-dom';
const Layout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className=" w-24 shadow-2xl fixed h-full z-40">
        <Sidebar />
      </div>
      <div className="ml-24 flex-1 p-5">
        <Outlet />
      </div>
    </div>
  )
}
const Appcontent = () => {
  const { alertMessage, alertType } = useContext(AlertContext);
  return (
    <Router>
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
        <Route element={<Layout />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </Router>
  )
}
const App = () => {
  return (
    <UserProvider>
      <AlertProvider>
        <Appcontent />
      </AlertProvider>
    </UserProvider>
  );
};
const ChatPage = () => {
  const { user, socket } = useUser();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const location = useLocation();

  useEffect(() =>{
    if (location.state?.conversation){
      const conversation = location.state.conversation;
      const updatedConversation = {
        ...conversation,
        participants: conversation.participants || []
      };
      setSelectedConversation(updatedConversation);

      if (socket && conversation._id){
        socket.emit('message:read', conversation._id);
      }
    }
  },[location.state, socket]);

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
      setConversations(prevConversation => {
        const exist = prevConversation.some(conv => conv._id === conversation._id);
        return exist ? prevConversation : [...prevConversation, conversation];
      });
      setSelectedConversation(conversation);
    });

    socket.on('friendRequestAccepted', ({ data }) => {
      const { conversation } = data;
      if (conversation) {
        setConversations(prevConversation => {
          const exist = prevConversation.some(conv => conv._id === conversation._id);

          return exist ? prevConversation : [...prevConversation, conversation];
        })

        setSelectedConversation(conversation);
        console.log("conversation", conversation);
      }
    });

    return () => {
      socket.off('conversation:created');
      socket.off('conversations:list');
      socket.off('user:online');
      socket.off('user:offline');
      socket.off('friendRequestAccepted');
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
  return (
    <div className="flex h-full space-x-4">
      {/* {alertMessage && (
        <div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
          <span className="text-center flex justify-center w-full items-center space-x-1 px-5">
            {alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            <p className="text-sm">{alertMessage}</p>
          </span>
        </div>
      )} */}
      <div className="w-1/4 bg-white rounded-2xl shadow-lg">
        <ConvesationList
          className="flex-1"
          setSelectedConversation={setSelectedConversation}
          onMessageClick={handleMessageClick}
          initialSelectedId = {location.state?.conversation?._id}
        />
      </div>

      <div className=" w-2/4 bg-white rounded-2xl shadow-lg">
        {selectedConversation && (
          <ChatWindow
            conversation={selectedConversation}
            currentUser={user}
          />
        )}
      </div>
      {/* {selectedConversation && selectedConversation.otherParticipant?.length > 1 && (/ */}
      <div className="w-1/4 bg-white rounded-2xl shadow-lg">
        <div className="flex-1">
          <Directory
            selectedConversation={selectedConversation}
            socket={socket}
          />
        </div>
      </div>
      {/* )} */}
    </div>
  )
}

export default App;
