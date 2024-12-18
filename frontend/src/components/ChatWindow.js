import React, { lazy, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GoDotFill } from "react-icons/go";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { IoIosSend } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";
import { useUser } from "../context/UserContext";
import { IoIosCheckmark } from "react-icons/io";
import axios from "axios";
import { MdClose } from "react-icons/md";
import { AlertContext } from "../context/AlertMessage";

const FilePreviewItem = ({ file, onRemove, uploadProgress }) => {
    console.log(file);
    return (
        <div className="relative flex items-center space-x-2 bg-gray-100 p-2 rounded-lg">
            {file.fileType === 'image' ? (
                <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    className="w-12 h-12 rounded-lg object-cover"
                />
            ) : (
                <div className="w-fit h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    {file.fileType === 'raw' ? (
                        <div className="w-fit flex items-center space-x-2">
                            <MdAttachFile className="text-gray-500 text-2xl" />
                            <p className="px-2">
                                {file.fileName}
                            </p>
                        </div>
                    ) : 'Other'}
                </div>
            )}
            <div className="flex-1">
                <p className="text-sm">{file.name}</p>
                {uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${uploadProgress}%` }}
                        />
                        <p className="text-xs text-gray-500">{uploadProgress}%</p>
                    </div>
                )}
            </div>
            {uploadProgress === undefined || uploadProgress === 100 ? (
                <button
                    onClick={() => onRemove(file)}
                    className="text-gray-500 rounded-full p-1"
                >
                    <MdClose className="text-sm" />
                </button>
            ) : null}
        </div>
    )
}
const ChatWindow = ({ conversation, currentUser }) => {
    const { socket } = useUser();
    const { showAlert } = useContext(AlertContext);
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [previews, setPreviews] = useState([]);
    const [otherParticipant, setOtherParticipant] = useState(null);
    const [conversationHeader, setConversationHeader] = useState({
        title: '',
        subtitle: '',
        avatar: '',
        subtitleColor: 'gray'
    });
    const [uploadProgress, setUploadProgress] = useState({});
    const fileInputRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (conversation.type === 'private') {
            // Use otherParticipant directly for private conversations
            const otherParticipant = conversation.otherParticipant;

            if (otherParticipant) {
                setConversationHeader({
                    title: otherParticipant.name || 'Unknown Contact',
                    subtitle: otherParticipant.status === 'online'
                        ? 'Online'
                        : `Active ${fomatLastActive(otherParticipant.lastActive, otherParticipant.status)}`,
                    avatar: otherParticipant.avatar || img1,
                    subtitleColor: otherParticipant.status === 'online' ? 'green' : 'gray'
                });
            }
        } else if (conversation.type === 'group') {
            setConversationHeader({
                title: conversation.name || 'Group',
                subtitle: `${conversation.participants?.length || 0} members`,
                avatar: conversation.avatarGroup,
                subtitleColor: 'gray'
            });
        }
    }, [conversation, currentUser]);

    const handleUserStatusChange = (user) => {
        if (conversation?.participants?.some(p => p._id === user._id)) {
            setOtherParticipant(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    status: user.status || 'offline',
                    lastActive: user.lastActive || new Date(),
                    name: user.name,
                    avatar: user.avatar,
                };
            });
        }
    };

    useEffect(() => {
        if (!socket) return;

        socket.on('user:online', handleUserStatusChange);
        socket.on('user:offline', handleUserStatusChange);

        return () => {
            socket.off('user:online', handleUserStatusChange);
            socket.off('user:offline', handleUserStatusChange);
        };
    }, [socket, conversation]);

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
    useEffect(() => {
        const unreadMessages = messages
            .filter(msg => msg.sender._id !== currentUser._id && msg.status !== 'read')
            .map(msg => msg._id);

        if (unreadMessages.length > 0 && conversation?._id) {
            socket.emit('message:read', conversation._id);
        }
    }, [messages, conversation?._id, currentUser._id]);

    useEffect(() => {
        if (!socket || !conversation?._id) return;
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

        socket.on('message:status-updated', handleMessageStatusUpdate);

        return () => {
            socket.off('message:status-updated', handleMessageStatusUpdate);
        };
    }, [socket, conversation?._id]);

    const handlFileUpload = async (e) => {
        const files = Array.from(e.target.files);

        const newSelectedFiles = files.slice(0, 2).map(file => ({
            file: file,
            fileName: file.name,
            fileType: file.type.startsWith('image') ? 'image' : 'raw',
            fileUrl: URL.createObjectURL(file),
        }))

        setPreviews(prevFiles => {
            const combinedFiles = [...prevFiles, ...newSelectedFiles]
                .filter((file, index, self) =>
                    index === self.findIndex(f => f.fileName === file.fileName)
                )
                .slice(0, 2);

            return combinedFiles;
        })
    }

    const uploadFilesToCloudinary = async (files) => {
        if (files.length === 0) return [];

        const formData = new FormData();
        const progressMap = {};

        files.forEach((file) => {
            formData.append('files', file.file);
            progressMap[file.fileName] = 0;
        });

        setUploadProgress(progressMap);

        try {
            const response = await axios.post("http://localhost:5000/api/upload/multiple", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                // timeout: 30000,
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);

                    setUploadProgress((prev) => {
                        const updatedProgress = { ...prev };
                        files.forEach((file) => {
                            updatedProgress[file.fileName] = percentCompleted;
                        });
                        return updatedProgress;
                    });
                }
            });

            return response.data.files.map(file => ({
                ...file,
                originalName: file.fileName,
            }));
        } catch (axiosError) {
            console.error('Detailed Upload Error:', axiosError);

            if (axiosError.code === 'ECONNABORTED') {
                alert('Upload timed out. Please check your internet connection and file size.');
            } else {
                alert(`Upload failed: ${axiosError.message}`);
            }

            return [];
        }
    }
    const removeSelectedFile = (fileToRemove) => {
        setPreviews(prevPreviews =>
            prevPreviews.filter(preview => preview.fileName !== fileToRemove.fileName)
        );

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
    const messageType = useMemo(() => {
        if (previews.length > 0) return 'multimedia';
        if (newMessage.trim() !== '') return 'text';
        return '';
    }, [previews, newMessage]);
    
    const sendMessage = async (e) => {
        e?.preventDefault();
        if (!socket) return;

        if (messageType === '' || (!newMessage.trim() && previews.length === 0)) {
            console.error('No content to send');
            return;
        }


        let uploadFiles = [];

        if (previews.length > 0) {
            uploadFiles = await uploadFilesToCloudinary(previews);

            if (uploadFiles.length === 0) {
                showAlert('Upload failed. Please try again later.', 'error');
                return;
            }
            showAlert('Files uploaded successfully', 'success');
            setPreviews([]);
        }
        const messageToSend = {
            content: newMessage,
            type: messageType,
            attachments: uploadFiles,
            sender: {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar,
            },
            tempId: Date.now().toString(),
            conversationId: conversation._id,
            status: 'sending',
        }

        // setMessages(prevMessages => [...prevMessages, messageToSend]);  

        if (uploadFiles.length > 0) {
            socket.emit('files:added', {
                ...uploadFiles[0],
                conversationId: conversation._id,
                sender: currentUser,
            })
        }

        if (!conversation._id) {
            socket.emit(
                'create:conversation',
                {
                    receiverId: otherParticipant?._id,
                    content: messageToSend,
                },
                (newConversation) => {
                    setMessages(newConversation.messages);
                }
            );
        } else {
            socket.emit('send:message', {
                conversationId: conversation._id,
                content: newMessage,
                type: messageType,
                attachments: uploadFiles,
                tempId: messageToSend.tempId,
            }, (error, serverMessage) => {
                if (error) {
                    setMessages(prevMessages =>
                        prevMessages.filter(msg => msg !== messageToSend)
                    );
                    showAlert('Message send failed', 'error');
                    return;
                }
                socket.emit('update:conversation', {
                    conversationId: conversation._id,
                    lastMessage: {
                        ...serverMessage,
                        tempId: messageToSend.tempId,
                    },
                    type: messageType,
                    attachments: uploadFiles,
                })
                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.tempId === messageToSend.tempId ? serverMessage : msg
                    )
                );
            }
            );
        }
        setPreviews([]);
        setUploadProgress({});
        setNewMessage('');


        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    const renderMessageContent = (message) => {
        if (message.type === 'multimedia' && message.attachments && message.attachments.length > 0) {
            return (
                <div>
                    {message.content && <p className="text-sm">{message.content}</p>}
                    {message.attachments.map((file, index) => {
                        switch (file.fileType) {
                            case 'image':
                                return (
                                    <div key={index}>
                                        <img
                                            src={file.fileUrl}
                                            alt={file.fileName}
                                            className="max-w-full h-auto rounded-lg mt-2"
                                        />
                                    </div>
                                );
                            case 'pdf':
                                return (
                                    <a
                                        key={index}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg mt-2 text-black"
                                    >
                                        PDF: {file.fileName}
                                    </a>
                                );
                            default:
                                return (
                                    <a
                                        key={index}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg mt-2 text-black"
                                    >
                                        {file.fileName}
                                    </a>
                                );
                        }
                    })}
                </div>
            );
        }
        return <p className="text-sm">{message.content}</p>;
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
                <IoIosCheckmark className="text-xl" />
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
    };

    return (
        <div className="h-full flex flex-col">
            <div className=" py-2 flex space-x-10 px-5 flex-none mt-3 border-b-2 border-gray-300">
                <div className="flex space-x-4">
                    <img
                        src={conversationHeader.avatar}
                        alt={conversationHeader.title}
                        className="rounded-lg w-11 h-11 mt-1 col-span-1"
                    />
                    <div className="text-left col-span-3 ">
                        <h1 className="font-bold text-2xl">
                            {conversationHeader.title}
                        </h1>
                        <div className="flex items-center">
                            <p className="text-xs">
                                <div className="flex items-center">
                                    <GoDotFill className={`text-${conversationHeader.subtitleColor}-500`} />
                                    <span className="">{conversationHeader.subtitle}</span>
                                </div>
                            </p>
                        </div>
                    </div>
                </div>

            </div>
            <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={msg._id}
                            className={`flex items-start ${msg.sender._id === currentUser._id ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className="flex flex-col">
                                {conversation.type === 'group' && msg.sender._id !== currentUser._id && (
                                    <div className="text-[10px] text-gray-500 mb-1 mr-1">{msg.sender.name}</div>
                                )}
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
                                        {msg.file ? (
                                            <FilePreviewItem
                                                file={{
                                                    fileName: msg.file.name,
                                                    fileType: msg.file.type.startsWith('image') ? 'image' : 'raw',
                                                    fileUrl: msg.file.url,
                                                }}
                                                onRemove={null} // Vì tin nhắn đã gửi thì không cần xóa
                                            />
                                        ) : (
                                            renderMessageContent(msg) 
                                        )}
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
            {previews.length > 0 && (
                <div className="flex items-center space-x-2 p-2">
                    {previews.map((preview) => (
                        <FilePreviewItem
                            key={preview.fileName}
                            file={preview}
                            onRemove={removeSelectedFile}
                            uploadProgress={uploadProgress[preview.fileName]}
                        />
                    ))}
                </div>
            )}
            <div className="p-3 px-4 space-x-4 flex items-center">
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    onChange={handlFileUpload}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                >
                    <MdAttachFile className="text-2xl" />
                </label>
                <input
                    type="text"
                    className="bg-gray-200 w-full p-2 rounded-lg focus:outline-none"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            sendMessage(e);
                        }
                    }}
                />
                <IoIosSend className="text-3xl" onClick={sendMessage} />
            </div>
        </div>

    );
};

export default ChatWindow;
