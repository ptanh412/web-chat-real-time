import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => ({
        _id: localStorage.getItem("userId") || "",
        name: localStorage.getItem("name") || "Guest",
        token: localStorage.getItem("token") || "",
        status: localStorage.getItem("status") || "Hey there! I'm using WhatsApp.",
        avatar: localStorage.getItem("avatar") || "",
    }));

    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const newSocket = io("http://localhost:5000", {
            auth: { token: user.token },
        });
        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user.token]);

    useEffect(() => {
        if (!socket) return;
        const handleUserOnline = (data) => {
            if (data.userId === user._id) {
                setUser((prevUser) => {
                    const updatedUser = { ...prevUser, status: data.status };
                    localStorage.setItem("status", data.status); // Lưu trạng thái mới vào localStorage
                    return updatedUser;
                });
            }
        }
        socket.on("user:online", handleUserOnline); 
        return () => {
            socket.off("user:online", handleUserOnline);
        };
    }, [socket, user._id]);
    const logout =() =>{
        localStorage.clear();
        setUser({
            _id: "",
            name: "Guest",
            token: "",
            status: "offline",
        });
        if(socket){
            socket.disconnect();
        }
        setSocket(null);
    }
    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        // Lưu thông tin mới vào localStorage
        for (const key in updates) {
            localStorage.setItem(key, updates[key]);
        }
    };
    return (
        <UserContext.Provider value={{ user, setUser: updateUser, socket, logout }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
