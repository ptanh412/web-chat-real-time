import React from "react";
import { IoIosAddCircle } from "react-icons/io";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";

const Message = ({ message }) => {
  return (
    <div className="">
      {/* <strong>{message.sender}</strong>: {message.content} */}
      <div className="flex justify-between items-center border-b-2 p-5">
        <h1 className="font-bold text-3xl">Message</h1>
        <IoIosAddCircle className="text-3xl text-blue-500" />
      </div>
      <div className="p-10">
        <div className="flex">
          <button className="bg-gray-100 rounded-l-lg px-3 hover:bg-gray-200 duration-150 text-gray-400">search</button>
          <input type="text" className="bg-gray-100 w-full py-1 px-3 rounded-r-lg outline-none" placeholder="Search message..." />
        </div>
      </div>
      <div className="px-8 mb-5">
        <div className="grid grid-cols-4 hover:bg-gray-200 py-2 rounded-lg px-3">
          <img src={img1} alt="" className="rounded-lg w-10 h-10 col-span-1" />
          <div className="text-left col-span-2">
            <h1 className="font-semibold">Name</h1>
            <p className="text-xs text-gray-500">Message</p>
          </div>
          <p className="text-sm text-gray-400 font-bold text-right">12m</p>
        </div>
      </div>
    </div>
  );
};

export default Message;
