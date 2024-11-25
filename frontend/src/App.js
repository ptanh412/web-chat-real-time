import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import Directory from "./components/Directory";
import Files from "./components/Files";
import "../src/styles/index.css";
import Message from "./components/Message";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";

const App = () => {
  // const [roomId, setRoomId] = useState("general"); // Mã phòng chat mặc định

  // // Thay đổi phòng chat khi người dùng chọn phòng
  // const handleRoomChange = (newRoomId) => {
  //   setRoomId(newRoomId);
  // };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        {/* <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<Profile />} /> */}
        <Route path="/chat" element={
          <div className="flex h-screen">
            <div className=" w-24 shadow-2xl">
              <Sidebar />
            </div>
            <div className="w-full flex justify-between h-screen">
              <div className="flex-1 flex flex-col">
                <Message className="flex-1" />
              </div>

              <div className=" flex-[2] flex flex-col">
                <ChatWindow className="flex-1" />
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
        } />
      </Routes>
    </Router>
  );

};

export default App;
