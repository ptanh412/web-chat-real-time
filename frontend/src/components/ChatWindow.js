import React from "react";
import useMessages from "../hooks/useMessages";
import Message from "./Message";
import { GoDotFill } from "react-icons/go";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { IoIosSend } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";

const ChatWindow = ({ roomId }) => {
    // const { messages, newMessage, sendMessage, handleMessageChange } = useMessages(roomId);

    return (
        <div className="border-x-2 mt-3 h-screen flex flex-col">
            <div className="border-b-2 py-2 flex space-x-10 px-5 flex-none">
                <img src={img1} alt="" className="rounded-lg w-11 h-11 mt-1 col-span-1" />
                <div className="text-left col-span-3">
                    <h1 className="font-bold text-2xl">Name</h1>
                    <div className="flex items-center">
                        <GoDotFill className="text-green-500" />
                        <p className="text-xs">Online</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    <div className="flex items-start">
                        <img src={img1} alt="" className="rounded-full w-8 h-8 mr-3" />
                        <div className="bg-gray-200 p-3 rounded-lg max-w-xs">
                            <p className="text-sm">Hello, how are you?</p>
                        </div>
                    </div>
                    <div className="flex items-start justify-end">
                        <div className="bg-blue-500 text-white p-3 rounded-lg max-w-xs">
                            <p className="text-sm">I'm good, thanks!</p>
                        </div>
                        <img src={img1} alt="" className="rounded-full w-8 h-8 ml-3" />
                    </div>
                </div>
            </div>
            <div className="p-3 px-4 space-x-4 flex items-center">
                <MdAttachFile className="text-2xl"/>
                <input
                    type="text"
                    className="bg-gray-200 w-full p-2 rounded-lg focus:outline-none"
                    placeholder="Type a message..."
                />
                <IoIosSend className="text-3xl"/>
            </div>
        </div>

    );
};

export default ChatWindow;
