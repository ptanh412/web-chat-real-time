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
      setConversations(conversationsList);
    });

    socket.on('conversation:created', (conversation) => {
      console.log('New conversation:', conversation);
      setSelectedConversation(prev => ({
        ...conversation,
        _id: conversation._id || (prev ? prev._id : null),
      }));
      setConversations((prevConversations) => {
        // Avoid duplicates
        const exists = prevConversations.some(conv => conv._id === conversation._id);
        return exists
          ? prevConversations
          : [...prevConversations, conversation];
      });
    })

    return () => {
      socket.off('conversation:created');
      socket.off('conversations:list');
    }
  }, [socket]);
  useEffect(() => {
    console.log('Selected Conversation (Full):', selectedConversation);
    console.log('Selected Conversation ID:', selectedConversation?._id);
  }, [selectedConversation]);

  const handleMessageClick = (conversation) => {
    if (socket && conversation._id) {
      socket.emit('message:read', conversation._id);
      setSelectedConversation(conversation);
    }
  }
  console.log(selectedConversation)
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
      <div className="flex h-screen">
        <div className=" w-24 shadow-2xl">
          <Sidebar />
        </div>
        <div className="w-full flex justify-between h-screen">
          <div className="flex-1 flex flex-col">
            <ConvesationList className="flex-1" setSelectedConversation={setSelectedConversation} onMessageClick={handleMessageClick} />
          </div>

          <div className=" flex-[2] flex flex-col">
            {selectedConversation && (
              <ChatWindow
                conversation={selectedConversation}
                currentUser={user}
              />
            )}
          </div>

          <div className="flex-1 flex flex-col">
            <div className="bg-blue-200 flex-1">
              <Directory />
            </div>
            <div className="bg-green-200 flex-1">
              <Files />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App;
