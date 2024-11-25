import React from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
const Directory = () => {
  const teamMembers = [
    { name: "Florencio Dorrance", role: "Manager" },
    { name: "Benny Spanbauer", role: "Sales" },
    { name: "Jamel Eusebio", role: "Admin" },
  ];

  return (
    <div className="">
      <h3>Team Members</h3>
      {/* <ul>
        {teamMembers.map((member, index) => (
          <li key={index}>
            {member.name} - {member.role}
          </li>
        ))}
      </ul> */}
    </div>
  );
};

export default Directory;
