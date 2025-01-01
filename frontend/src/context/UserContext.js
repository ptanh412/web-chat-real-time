import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(() => ({
        _id: localStorage.getItem("userId") || "",
        name: localStorage.getItem("name") || "Guest",
        email: localStorage.getItem("email") || "",
        token: localStorage.getItem("token") || "",
        status: localStorage.getItem("status") || "Hey there! I'm using WhatsApp.",
        avatar: localStorage.getItem("avatar") || "",
        lastActive: localStorage.getItem("lastActive") || "",
        phoneNumber: localStorage.getItem("phoneNumber") || "",
        about: localStorage.getItem("about") || "",
    }));
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (user.token) {
            const newSocket = io("http://localhost:5000", {
                auth: { token: user.token },
            });
            newSocket.on("connect", () => {
                newSocket.emit('user:online', {
                    _id: user._id,
                    status: 'online',
                    lastActive: new Date(),
                    name: user.name,
                    avatar: user.avatar
                });
            });

            setSocket(newSocket);

            return () => {
                if (newSocket) {
                    newSocket.disconnect();
                }
            };
        }
    }, [user.token]);


    useEffect(() => {
        if (!socket) return;

        const handleUserOnline = (data) => {
            // console.log('User Online Event:', data);

            setUser((prevUser) => {
                if (data._id === prevUser._id) {
                    localStorage.setItem("status", data.status || 'online');
                    localStorage.setItem("lastActive", data.lastActive || new Date());
                }
                return {
                    ...prevUser,
                    status: data._id === prevUser._id ? data.status || 'online' : prevUser.status,
                    lastActive: data._id === prevUser._id ? data.lastActive || new Date() : prevUser.lastActive
                }
            });
        }
        const handleUserOffline = (data) => {
            setUser((prevUser) => {
                if (data._id === prevUser._id) {
                    localStorage.setItem("status", data.status || 'offline');
                    localStorage.setItem("lastActive", data.lastActive || new Date());
                }
                return {
                    ...prevUser,
                    status: data._id === prevUser._id ? data.status || 'offline' : prevUser.status,
                    lastActive: data._id === prevUser._id ? data.lastActive || new Date() : prevUser.lastActive
                }
            });
        }
        socket.on("user:online", handleUserOnline);
        socket.on("user:offline", handleUserOffline);
        return () => {
            socket.off("user:online", handleUserOnline);
            socket.off("user:offline", handleUserOffline);
        };
    }, [socket, user._id]);
    const logout = () => {
        return new Promise((resolve) => {
            if (socket) {
                // Update local state first
                localStorage.clear();
                setUser({
                    _id: "",
                    name: "Guest",
                    token: "",
                    status: "offline",
                    avatar: "",
                    lastActive: null,
                });
                
                // Then emit offline status
                socket.emit('user:offline', {
                    _id: user._id,
                    status: 'offline',
                    lastActive: new Date()
                });
                
                socket.disconnect();
                setSocket(null);
            }
            resolve();
        });
    };
    const updateUser = (updates) => {
        const updatedUser = { ...user, ...updates };
        setUser(updatedUser);
        Object.entries(updates).forEach(([key, value])=>{
            localStorage.setItem(key, value || ""); ;
        })
    };
    return (
        <UserContext.Provider value={{ user, setUser, socket, setSocket, logout, updateUser }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);
