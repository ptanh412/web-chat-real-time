import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { GoDotFill } from "react-icons/go";
import img1 from "../assets/avatars/1920x1080_px_architecture_Hotels_Marina_Bay_reflection_Singapore-1199381.jpg";
import { IoIosSend } from "react-icons/io";
import { MdAttachFile } from "react-icons/md";
import { useUser } from "../context/UserContext";
import { IoIosCheckmark } from "react-icons/io";
import { FaReply, FaTrash } from 'react-icons/fa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from "../components/ui/dialog.js";
import axios from "axios";
import { MdClose } from "react-icons/md";
import { AlertContext } from "../context/AlertMessage";
import MessageReactions from "./MessageReaction";
import { MdOutlineEmojiEmotions } from "react-icons/md";
import { motion, AnimatePresence } from 'framer-motion';
import { FaImage, FaVideo, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFile, FaDownload } from "react-icons/fa";


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
const REACTIONS = [
    { emoji: '❤️', name: 'heart' },
    { emoji: '👍', name: 'like' },
    { emoji: '😮', name: 'wow' },
    { emoji: '😠', name: 'angry' },
    { emoji: '😢', name: 'cry' }
];
const ChatWindow = ({ conversation, currentUser }) => {
    const { socket } = useUser();
    const { showAlert } = useContext(AlertContext);
    const messagesEndRef = useRef(null);
    const [messages, setMessages] = useState([]);
    const [replyingTo, setReplyingTo] = useState(null);
    const [recallDialogOpen, setRecallDialogOpen] = useState(false);
    const [messageToReCall, setMessageToReCall] = useState(null);
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
    const [showReactions, setShowReactions] = useState(false);
    const [activeMessageId, setActiveMessageId] = useState(null);
    const fileInputRef = useRef(null);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    const popoverRef = useRef(null);

    useEffect(scrollToBottom, [messages]);
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setShowReactions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleEmojiClick = (messageId) => {
        setActiveMessageId(messageId);
        setShowReactions(!showReactions);
    };

    const handleReact = (emoji, messageId) => {
        handleReaction(messageId, emoji);
        setShowReactions(false);
        setActiveMessageId(null);
    };
    useEffect(() => {
        if (conversation.type === 'private') {
            const otherParticipant = conversation.otherParticipant;

            if (otherParticipant) {
                setOtherParticipant(otherParticipant);
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
    }, [conversation]);

    const handleUserStatusChange = useCallback((user) => {
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

            if (conversation.type === 'private' && conversation.otherParticipant._id === user._id) {
                setConversationHeader(prev => ({
                    ...prev,
                    subtitle: user.status === 'online'
                        ? 'Online'
                        : `Active ${fomatLastActive(user.lastActive, user.status)}`,
                    subtitleColor: user.status === 'online' ? 'green' : 'gray'
                }));
            }
        }
    }, [conversation]);

    useEffect(() => {
        if (!socket) return;
        socket.on('user:online', handleUserStatusChange);
        socket.on('user:offline', handleUserStatusChange);

        return () => {
            socket.off('user:online', handleUserStatusChange);
            socket.off('user:offline', handleUserStatusChange);
        };
    }, [socket, handleUserStatusChange, conversation?._id]); // Thêm conversation?._id

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

        socket.on('user:online', handleUserStatusChange);

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
            socket.off('user:online', handleUserStatusChange);
        }
    }, [socket, conversation?._id, currentUser, handleUserStatusChange]);

    useEffect(() => {
        if (!socket) return;

        socket.on('message:reaction-updated', ({ messageId, reactions }) => {
            setMessages(prevMessages =>
                prevMessages.map(msg => {
                    if (msg._id === messageId) {
                        return { ...msg, reactions }; // Sử dụng hoàn toàn dữ liệu từ server
                    }
                    return msg;
                })
            );
        });

        return () => {
            socket.off('message:reaction-updated');
        };
    }, [socket]);
    const handleReaction = (messageId, emoji) => {
        if (!socket) return;
        socket.emit('message:react', { messageId, emoji });
    }
    const handleRemoveReaction = (emoji, messageId) => {
        if (!socket) return;
        socket.emit('message:remove-reaction', { messageId, emoji });
    }
    useEffect(() => {
        if (!socket || !conversation?._id) return;
        const unreadMessages = messages
            .filter(msg => msg.sender._id !== currentUser._id && msg.status !== 'read')
            .map(msg => msg._id);

        if (unreadMessages.length > 0 && conversation?._id) {
            socket.emit('message:read', conversation._id);
        }
    }, [messages, conversation?._id, currentUser._id]);

    useEffect(() => {
        if (!socket) return;

        socket.on('message:recalled', ({ messageId, recallType, message }) => {
            setMessages(prevMessages =>
                prevMessages.map(msg =>
                    msg._id === messageId
                        ? { ...msg, isRecalled: true, recallType }
                        : msg
                )
            );
        });

        return () => {
            socket.off('message:recalled');
        };
    }, [socket]);

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
            createdAt: new Date()
        }
        if (uploadFiles.length > 0) {
            uploadFiles.forEach(file => {
                socket.emit('files:added', {
                    ...file,
                    conversationId: conversation._id,
                    sender: currentUser,
                    createdAt: new Date().toISOString()
                });
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
                sender: {
                    _id: currentUser._id,
                    name: currentUser.name,
                    avatar: currentUser.avatar
                },
                replyTo: replyingTo?._id,
                createdAt: new Date()
            }, (error, serverMessage) => {
                if (error) {
                    setMessages(prevMessages =>
                        prevMessages.filter(msg => msg !== messageToSend)
                    );
                    showAlert('Message send failed', 'error');
                    return;
                }

                setMessages((prevMessages) =>
                    prevMessages.map((msg) =>
                        msg.tempId === messageToSend.tempId ? serverMessage : msg
                    )
                );
            }
            );
        }
        setReplyingTo(null);
        setPreviews([]);
        setUploadProgress({});
        setNewMessage('');


        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    useEffect(() => {
        if (!socket) return;

        const handleMessageUpdate = (updatedMessage) => {
            setMessages(prev =>
                prev.map(msg =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                )
            )
        }

        const handleMessageRecall = ({ messageId, recallType, message, sender }) => {
            setMessages(prev =>
                prev.map(msg => {
                    if (msg._id === messageId) {
                        let updatedContent;
                        if (recallType === 'everyone') {
                            updatedContent = sender._id === currentUser._id
                                ? 'You have recalled a message'
                                : `${sender.name} has recalled a message`
                        } else if (recallType === 'self') {
                            updatedContent = sender._id === currentUser._id
                                ? 'You have recalled a message'
                                : msg.content;
                        }
                        return {
                            ...msg,
                            ...message,
                            isRecalled: true,
                            recallType,
                            content: updatedContent,
                            attachments: [],
                            sender: {
                                ...sender,
                                _id: sender._id,
                                name: sender.name,
                                avatar: sender.avatar,
                                status: sender.status,
                                lastActive: sender.lastActive
                            }
                        };
                    }
                    return msg;
                })
            )
        }
        const handleMessageReply = (newMessage) => {
            if (newMessage.conversationId === conversation._id) {
                setMessages(prev => {
                    const messageExist = prev.some(msg => msg._id === newMessage._id);
                    if (messageExist) {
                        return prev.map(msg =>
                            msg._id === newMessage._id ? newMessage : msg
                        );
                    }
                    return [...prev, newMessage];
                })
            }
        }
        socket.on('message:updated', handleMessageUpdate);
        socket.on('message:recalled', handleMessageRecall);
        socket.on('message:reply', handleMessageReply);

        return () => {
            socket.off('message:updated', handleMessageUpdate);
            socket.off('message:recalled', handleMessageRecall);
            socket.off('message:reply', handleMessageReply);
        }
    }, [socket, conversation?._id]);
    const handleReply = (message) => {
        setReplyingTo(message);
    }

    const cancelReply = () => {
        setReplyingTo(null);
    }

    const handleRecall = (message) => {
        setMessageToReCall(message);
        setRecallDialogOpen(true);
    }

    const confirmRecall = async (recallType) => {
        if (!socket || !messageToReCall) return;

        setMessages(prev =>
            prev.map(msg => {
                if (msg._id === messageToReCall._id) {
                    const updatedContent = recallType === 'everyone'
                        ? 'You have recalled a message'
                        : 'You have recalled a message';
                    return {
                        ...msg,
                        isRecalled: true,
                        recallType,
                        content: updatedContent,
                        attachments: []
                    };
                }
                return msg;
            }
            )
        )
        socket.emit('message:recall', {
            messageId: messageToReCall._id,
            recallType,
            conversationId: conversation._id,
            sender: {
                _id: currentUser._id,
                name: currentUser.name,
                avatar: currentUser.avatar,
                status: currentUser.status,
                lastActive: currentUser.lastActive
            },
            content: messageToReCall.content,
        }, (error) => {
            if (error) {
                setMessages(prev =>
                    prev.map(msg =>
                        msg._id === messageToReCall._id
                            ? { ...msg, isRecalled: false }
                            : msg
                    )
                )
                showAlert('Recall failed', 'error');
            }
        })
        setRecallDialogOpen(false);
        setMessageToReCall(null);
    }

    const renderReplyPreview = (message) => {
        if (!message.replyTo) return null;
        const repliedMessage = messages.find(msg => msg._id === message.replyTo);

        if (!repliedMessage) return null;

        return (
            <div className="bg-gray-100 p-2 rounded-t-lg text-sm text-gray-600 border-l-2 border-blue-500">
                <div className="font-semibold">{repliedMessage.sender.name}</div>
                <div className="truncate">{repliedMessage.content}</div>
            </div>
        )
    }
    const getFileIcon = (fileType) => {
        const iconMap = {
            'image': <div className="bg-blue-500 text-white p-3 rounded-lg"><FaImage className="text-3xl" /></div>,
            'video': <div className="bg-green-500 text-white p-3 rounded-lg"><FaVideo className="text-3xl" /></div>,
            'pdf': <div className="bg-red-500 text-white p-2 rounded-full"><FaFilePdf className="text-" /></div>,
            'document': <div className="bg-blue-400 text-white p-3 rounded-lg"><FaFileWord className="text-3xl" /></div>,
            'spreadsheet': <div className="bg-green-600 text-white p-3 rounded-lg"><FaFileExcel className="text-3xl" /></div>,
            'presentation': <div className="bg-orange-500 text-white p-3 rounded-lg"><FaFilePowerpoint className="text-3xl" /></div>,
            'archive': <div className="bg-gray-500 text-white p-3 rounded-lg"><FaFileArchive className="text-3xl" /></div>,
            'other': <div className="bg-gray-400 text-white p-3 rounded-lg"><FaFile className="text-3xl" /></div>
        };
        return iconMap[fileType] || iconMap.other;
    };
    
    const renderMessage = (msg, index) => {
        const isOwnMessage = msg.sender._id === currentUser._id;
        return (
            <div
                key={msg._id || index}
                className={`flex items-start ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
            >
                <div className="flex flex-col max-w-[70%] group relative" ref={popoverRef}>
                    {conversation.type === 'group' && !isOwnMessage && (
                        <div className="text-[10px] text-gray-500 mb-1 ml-11">
                            {msg.sender.name}
                        </div>
                    )}

                    <div className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                        ${isOwnMessage ? 'right-full mr-2' : 'left-full ml-2'} 
                        flex items-center space-x-2 bg-white rounded-lg shadow p-1`}>
                        <button
                            onClick={() => handleEmojiClick(msg._id)}
                            className="p-1.5 rounded-full hover:bg-gray-100"
                        >
                            <MdOutlineEmojiEmotions className="w-3 h-3 text-gray-500" />
                        </button>
                        <button
                            onClick={() => handleReply(msg)}
                            className="p-1.5 rounded-full hover:bg-gray-100"
                        >
                            <FaReply className="w-3 h-3 text-gray-500" />
                        </button>
                        {isOwnMessage && !msg.isRecalled && (
                            <button
                                onClick={() => handleRecall(msg)}
                                className="p-1.5 rounded-full hover:bg-gray-100"
                            >
                                <FaTrash className="w-3 h-3 text-gray-500" />
                            </button>
                        )}
                    </div>

                    <div className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-start relative`}>
                        {!isOwnMessage && (
                            <img
                                src={msg.sender.avatar}
                                alt={msg.sender.name}
                                className="rounded-full w-8 h-8 mr-3"
                            />
                        )}

                        <div className="flex flex-col relative">
                            {renderReplyPreview(msg)}

                            <div className={`p-3 rounded-lg ${msg.isRecalled
                                ? 'bg-gray-200'
                                : isOwnMessage
                                    ? (msg.type === 'text' ? 'bg-blue-500 text-white' : '')
                                    : 'bg-gray-200'
                                }`}>
                                {msg.isRecalled ? (
                                    msg.recallType === 'everyone' ? (
                                        isOwnMessage ? (
                                            <span className="text-gray-500 italic">You have recalled</span>
                                        ) : (
                                            <span className="text-gray-500 italic">{msg.sender.name} has recalled</span>
                                        )
                                    ) : msg.recallType === 'self' && isOwnMessage ? (
                                        <span className="text-gray-500 italic">You have recalled</span>
                                    ) : (
                                        renderMessageContent(msg) // Hiển thị tin nhắn gốc cho người nhận
                                    )
                                ) : (
                                    renderMessageContent(msg) // Hiển thị tin nhắn gốc nếu chưa thu hồi
                                )}
                            </div>

                            {/* Emoji Reaction Popup */}
                            <AnimatePresence>
                                {showReactions && activeMessageId === msg._id && (
                                    <motion.div
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        className="absolute bottom-full mb-1 bg-white rounded-lg shadow-lg p-2 border flex space-x-2 z-[9999]"
                                        style={{
                                            left: isOwnMessage ? 'auto' : '0',
                                            right: isOwnMessage ? '0' : 'auto',
                                        }}
                                    >
                                        {REACTIONS.map(({ emoji, name }) => (
                                            <button
                                                key={name}
                                                onClick={() => handleReact(emoji, msg._id)}
                                                className="hover:bg-gray-100 p-1 rounded-full transition-colors"
                                                title={name}
                                            >
                                                <span className="text-lg">{emoji}</span>
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {isOwnMessage && (
                            <img
                                src={currentUser.avatar}
                                alt="You"
                                className="rounded-full w-8 h-8 ml-3"
                            />
                        )}
                    </div>

                    {/* Reactions display */}
                    <div className={`flex mt-1 ${isOwnMessage ? 'justify-start' : 'justify-end'}`}>
                        <MessageReactions
                            message={msg}
                            currentUser={currentUser}
                            onReact={(emoji) => handleReaction(msg._id, emoji)}
                            existingReactions={msg.reactions || []}
                            onRemoveReaction={(emoji) => handleRemoveReaction(emoji, msg._id)}
                        />
                    </div>

                    <div className="relative h-4 w-28">
                        <div className="absolute">
                            {renderMessageStatus(msg, index === messages.length - 1)}
                        </div>
                    </div>
                </div>
            </div>
        );
    };
    const renderMessageContent = (message) => {
        if (message.type === 'multimedia' && message.attachments && message.attachments.length > 0) {
            return (
                <div className="">
                    {message.attachments.map((file, index) => {
                        switch (file.fileType) {
                            case 'image':
                                return (
                                    <div key={index}>
                                        <img
                                            src={file.fileUrl}
                                            alt={file.fileName}
                                            className="h-44 w-60 rounded-t-lg mt-2"
                                        />
                                        {message.content && <p className="text-sm bg-blue-500 text-white w-full text-end py-1 px-3 rounded-b-lg">{message.content}</p>}
                                    </div>
                                );
                            // case 'pdf':
                            //     return (
                            //         <a
                            //             key={index}
                            //             href={file.fileUrl}
                            //             target="_blank"
                            //             rel="noreferrer"
                            //             className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg mt-2 text-black"
                            //         >
                            //             {file.fileName}
                            //         </a>
                            //     );
                            default:
                                return (
                                    <a
                                        key={index}
                                        href={file.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center space-x-2 bg-gray-100 p-2 rounded-lg mt-2 text-black"
                                    >
                                        <div className="items-center flex justify-center">
                                            <div className="mr-2">
                                                {getFileIcon(file?.fileType)}
                                            </div>
                                            <p className="text-[14px] font-semibold py-1 rounded-xl">{file.fileName}</p>
                                        </div>
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

        if (message.isRecalled) {
            return (
                <div className={`text-xs font-serif ${statusColors[message.status]} flex items-center`}>
                    <IoIosCheckmark className="text-xl" />
                    {statusText[message.status]}
                    {message.status !== 'sent' && ` at ${formatMessageTime(message.readAt || message.deliveredAt || message.sentAt)}`}
                </div>
            );
        }
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
                    {messages.map((msg, index) => renderMessage(msg, index))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
            {replyingTo && (
                <div className="px-4 py-2 bg-gray-100 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                            Replying to {replyingTo.sender.name}
                        </span>
                        <span className="text-sm text-gray-600 truncate">
                            {replyingTo.content}
                        </span>
                    </div>
                    <button
                        onClick={cancelReply}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <MdClose />
                    </button>
                </div>
            )}
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
            <Dialog
                open={recallDialogOpen}
                onOpenChange={setRecallDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Recall Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Button
                            onClick={() => confirmRecall('everyone')}
                            className="w-full mt-3"
                        >
                            Recall for everyone
                        </Button>
                        <Button
                            onClick={() => confirmRecall('self')}
                            className="w-full"
                            variant="outline"
                        >
                            Recall for me only
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ChatWindow;
