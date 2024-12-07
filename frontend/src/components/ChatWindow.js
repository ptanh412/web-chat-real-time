import React, { useEffect, useRef, useState } from "react";
import { GoDotFill } from "react-icons/go";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { IoIosSend } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";
import { useUser } from "../context/UserContext";
import { IoIosCheckmark } from "react-icons/io";


const ChatWindow = ({ conversation, currentUser }) => {
    const { socket } = useUser();
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    useEffect(scrollToBottom, [messages]);
    useEffect(() => {
        setMessages([]);

        if (socket && conversation?._id) {
            const conversationId = conversation._id.toString();
            socket.emit('get:messages', conversationId);
            socket.emit('mark:conversation-read', conversationId);
        }
    }, [conversation?._id, socket])

    useEffect(() => {
        if (!socket || !conversation) return;

        if (!conversation || !conversation._id) {
            console.log('No valid conversation:', conversation);
            return;
        }

        const conversationId = conversation._id.toString();

        socket.emit('join:conversation', conversationId);
        // socket.emit('get:messages', conversationId);

        socket.on('messages:list', (allMessages) => {
            setMessages(allMessages);
        });

        socket.on('new:message', (newMessage) => {
            if (newMessage.conversationId === conversationId) {
                setMessages((prevMessages) => {
                    const isMessagExist = prevMessages.some(
                        msg => msg._id === newMessage._id
                    );
                    const filteredMessages = prevMessages.filter(
                        msg => !(msg.isTemp && msg.content === newMessage.content)
                    );
                    if (newMessage.sender._id !== currentUser._id) {
                        socket.emit('message:delivered', newMessage._id);
                    }
                    return isMessagExist
                        ? filteredMessages
                        : [...filteredMessages, newMessage];
                })
            }
        });

        socket.on('message:status-updated', (updatedMessage) => {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === updatedMessage._id
                        ? { ...msg, status: 'read', readAt: updatedMessage.readAt }
                        : msg
                )
            );
        });

        return () => {
            socket.off('new:message');
            socket.off('messages:list');
            socket.off('message:status-updated');
            socket.emit('leave:conversation', conversationId);
        }
    }, [socket, conversation?._id, currentUser]);


    // useEffect(() => {
    //     const unreadMessages = messages
    //         .filter(msg => msg.sender._id !== currentUser._id && msg.status !== 'read')
    //         .map(msg => msg._id);

    //     if (unreadMessages.length > 0 && conversation?._id) {
    //         socket.emit('message:read', conversation._id);
    //     }
    // }, [messages, conversation?._id, currentUser._id]);

    useEffect(() => {
        const handleMessageStatusUpdate = (updatedMessages) => {
            if (Array.isArray(updatedMessages)) {
                setMessages(prevMessages =>
                    prevMessages.map(msg => {
                        const updatedMsg = updatedMessages.find(
                            u => u._id === msg._id &&
                                u.conversationId === conversation?._id
                        );

                        return updatedMsg
                            ? { ...msg, status: 'read', readAt: updatedMsg.readAt }
                            : msg;
                    })
                );
            }
        };

        // Lắng nghe sự kiện cập nhật status message
        socket.on('message:status-updated', handleMessageStatusUpdate);

        return () => {
            socket.off('message:status-updated', handleMessageStatusUpdate);
        };
    }, [socket, conversation?._id]);

    const sendMessage = () => {
        if (!newMessage.trim() || !conversation) return;
        // Tạo tin nhắn tạm thời
        const tempMessage = {
            _id: `temp-${Date.now()}`,
            content: newMessage,
            sender: {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar,
            },
            conversationId: conversation._id,
            status: 'sent',
            sentAt: new Date(),
            isTemp: true,
        };

        setMessages(prevMessages => [...prevMessages, tempMessage]);

        const sendMessageHandler = (error, serverMessage) => {
            if (error) {
                alert('Error sending message: ' + error.message);
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg._id === tempMessage._id
                            ? { ...msg, status: 'error' }
                            : msg
                    )
                );
                return;
            }

            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === tempMessage._id ? serverMessage : msg
                )
            );
        };

        if (!conversation._id) {
            socket.emit(
                'create:conversation',
                {
                    receiverId: otherParticipant?._id,
                    content: newMessage,
                },
                (newConversation) => {
                    setMessages(newConversation.messages);
                }
            );
        } else {
            socket.emit('send:message', {
                conversationId: conversation._id,
                content: newMessage,
            }, sendMessageHandler);
        }

        setNewMessage('');
    };

    const formatMessageTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const renderMessageStatus = (message, isLastMessage) => {
        if (!isLastMessage || message.sender._id !== currentUser._id) return null;

        const statusColors = {
            read: 'text-gray-400',
            delivered: 'text-blue-500',
            sent: 'text-gray-500'
        };

        const statusText = {
            read: 'Seen',
            delivered: 'Delivered',
            sent: 'Sent'
        };

        return (
            <div className={`text-xs font-serif ${statusColors[message.status]} flex items-center`}>
                <IoIosCheckmark  className="text-xl"/>
                {/* <IoIosCheckmark className="text-xl"/> */}
                {statusText[message.status]}
                {message.status !== 'sent' && ` at ${formatMessageTime(message.readAt || message.deliveredAt || message.sentAt)}`}
            </div>
        );
    };

    const fomatLastActive = (lastActive, status) => {
        if (status === 'online') return 'Online';

        const now = new Date();
        const date = new Date(lastActive);
        const diffMinutes = Math.round((now - date) / 60000);
        if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
        if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)} hours ago`;
        const hours = Math.floor(diffMinutes / 60);
        if (hours < 24) return `${hours} hours ago`;

        const days = Math.floor(hours / 24);
        return `${days} days ago`;
    }

    const otherParticipant = Array.isArray(conversation?.participants)
        ? conversation.participants.find(p => p._id !== currentUser._id)
        : null;

    return (
        <div className="border-x-2 mt-3 h-screen flex flex-col">
            <div className="border-b-2 py-2 flex space-x-10 px-5 flex-none">
                {otherParticipant && (
                    <div className="flex space-x-4">
                        <img
                            src={otherParticipant?.avatar || img1}
                            alt={otherParticipant?.name || 'Unknow'}
                            className="rounded-lg w-11 h-11 mt-1 col-span-1"
                        />
                        <div className="text-left col-span-3 ">
                            <h1 className="font-bold text-2xl">
                                {otherParticipant?.name}
                            </h1>
                            <div className="flex items-center">
                                <p className="text-xs">
                                    {otherParticipant?.status === 'online' ? (
                                        <div className="flex items-center">
                                            <GoDotFill className="text-green-500" />
                                            <span className="">Online</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <GoDotFill className="text-gray-300" />
                                            <span className="">Active {fomatLastActive(otherParticipant?.lastActive, otherParticipant?.status)}</span>
                                        </div>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={msg._id}
                            className={`flex items-start ${msg.sender._id === currentUser._id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="flex flex-col">
                                <div className="flex">
                                    {msg.sender._id !== currentUser._id && (
                                        <img
                                            src={msg.sender.avatar}
                                            alt={msg.sender.name}
                                            className="rounded-full w-8 h-8 mr-3"
                                        />
                                    )}
                                    <div
                                        className={`p-3 rounded-lg max-w-xs ${msg.sender._id === currentUser._id
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-200'
                                            }`}
                                    >
                                        <p className="text-sm">{msg.content}</p>
                                    </div>

                                    {msg.sender._id === currentUser._id && (
                                        <img
                                            src={currentUser.avatar}
                                            alt="You"
                                            className="rounded-full w-8 h-8 ml-3"
                                        />
                                    )}
                                </div>
                                <div className="mt-2">
                                    {renderMessageStatus(msg, (msg.sender._id === currentUser._id) && (index === messages.length - 1))}
                                </div>
                            </div>
                            <div ref={messagesEndRef} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-3 px-4 space-x-4 flex items-center">
                <MdAttachFile className="text-2xl" />
                <input
                    type="text"
                    className="bg-gray-200 w-full p-2 rounded-lg focus:outline-none"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            sendMessage(e.target.value);
                        }
                    }}
                />
                <IoIosSend className="text-3xl" />
            </div>
        </div>

    );
};

export default ChatWindow;
