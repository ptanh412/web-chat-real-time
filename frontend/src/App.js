import React, { useContext, useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Directory from "./components/Directory";
import Files from "./components/Files";
import "../src/styles/index.css";
import ConvesationList from "./components/ConvesationList";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import { AlertContext, AlertProvider } from "./context/AlertMessage";
import { FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import { UserProvider, useUser } from "./context/UserContext";
const App = () => {
  return (
    <UserProvider>
      <AlertProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/chat" element={
              <ChatPage />
            } />
          </Routes>
        </Router>
      </AlertProvider>
    </UserProvider>
  );
};
const ChatPage = () => {
  const { user, socket } = useUser();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const { alertMessage, alertType } = useContext(AlertContext);

  useEffect(() => {
    if (!socket) return;

    socket.emit('get:conversations');
    socket.on('conversations:list', (conversationsList) => {
      setConversations(conversationsList || []);
    });

    socket.on('user:online', (user) => {
      setConversations((prevConversations = []) => {
        // Ensure prevConversations is an array
        const safeConversations = prevConversations || [];

        return safeConversations.map((conv) => {
          // Add a null check for participants
          if (conv.participants && conv.participants.some(p => p._id === user._id)) {
            return {
              ...conv,
              participants: (conv.participants || []).map(participant =>
                participant._id === user._id
                  ? {
                    ...participant,
                    status: user.status,
                    lastActive: user.lastActive,
                    avatar: user.avatar,
                    name: user.name
                  }
                  : participant
              )
            }
          }
          return conv;
        })
      });

      setSelectedConversation((prevConversation) => {
        // Add multiple null checks
        if (prevConversation &&
          prevConversation.participants &&
          Array.isArray(prevConversation.participants) &&
          prevConversation.participants.some(p => p._id === user._id)) {
          return {
            ...prevConversation,
            participants: (prevConversation.participants || []).map(participant =>
              participant._id === user._id
                ? {
                  ...participant,
                  status: user.status,
                  lastActive: user.lastActive,
                  avatar: user.avatar,
                  name: user.name
                }
                : participant
            )
          }
        }
        return prevConversation;
      });
    });

    socket.on('conversation:created', (conversation) => {
      setSelectedConversation(prev => ({
        ...conversation,
        _id: conversation._id || (prev ? prev._id : null),
      }));

      setConversations((prevConversations = []) => {
        const safeConversations = prevConversations || [];
        const exists = safeConversations.some(conv => conv._id === conversation._id);
        return exists
          ? safeConversations
          : [...safeConversations, conversation];
      });
    });

    return () => {
      socket.off('conversation:created');
      socket.off('conversations:list');
      socket.off('user:online');
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
    <>
      {alertMessage && (
        <div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
          <span className="text-center flex justify-center w-full items-center space-x-1 px-5">
            {alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
            <p className="text-sm">{alertMessage}</p>
          </span>
        </div>
      )}
      <div className="flex h-screen overflow-hidden">
        <div className=" w-24 shadow-2xl fixed h-full z-50">
          <Sidebar />
        </div>
        <div className="ml-24 w-[calc(100%-6rem)] flex fixed h-full p-5 justify-between space-x-3">
          <div className="flex-1 flex flex-col rounded-2xl shadow-xl h-full">
            <ConvesationList
              className="flex-1"
              setSelectedConversation={setSelectedConversation}
              onMessageClick={handleMessageClick}
            />
          </div>

          <div className=" flex-[2] flex flex-col h-full rounded-2xl shadow-xl">
            {selectedConversation && (
              <ChatWindow
                conversation={selectedConversation}
                currentUser={user}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col rounded-2xl shadow-xl">
            <div className="flex-1">
              <Directory
                selectedConversation={selectedConversation}
                socket={socket}
              />
            </div>
            {/* <div className="flex-1">
              <Files />
            </div> */}
          </div>
        </div>
      </div>
    </>
  )
}

export default App;
