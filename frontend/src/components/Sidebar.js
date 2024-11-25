import React from "react";
import { LuHome } from "react-icons/lu";
import { AiOutlineMessage } from "react-icons/ai";
import { IoIosSearch, IoMdSettings } from "react-icons/io";
import { RiProfileLine } from "react-icons/ri";
import img1 from"../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg" ;
const Sidebar = ({ onRoomChange }) => {
  const rooms = ["general", "random", "help", "coding"];

  return (
    <div className="flex flex-col items-center h-screen mt-2">
      <img src={img1} alt="avatar" className="w-16 h-16 rounded-full" />
      <ul className=" space-y-8 mt-10 text-2xl flex-[4]">
        <li >
          <LuHome className="hover:text-blue-300 duration-300" />
        </li>
        <li>
          <AiOutlineMessage className="hover:text-blue-300 duration-300" />
        </li>
        <li>
          <IoIosSearch className="hover:text-blue-300 duration-300" />
        </li>
        <li>
          <RiProfileLine className="hover:text-blue-300 duration-300" />
        </li>
      </ul>
      <IoMdSettings className="hover:text-blue-300 duration-300 flex-1 text-2xl" />

      {/* <ul className="text-white">
        {rooms.map((room) => (
          <li
            key={room}
            className="cursor-pointer hover:bg-gray-700 p-2"
            onClick={() => onRoomChange(room)}
          >
            {room}
          </li>
        ))}
      </ul> */}
    </div>
  );
};

export default Sidebar;
