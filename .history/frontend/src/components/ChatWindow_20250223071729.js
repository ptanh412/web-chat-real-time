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
import { useTheme } from "../context/ThemeContext.js";
import ImagePreviewModal from "./ImgaePreviewModal.js";
import { HiChevronDown, HiChevronUp, HiX } from "react-icons/hi";


const FilePreviewItem = ({ file, onRemove, uploadProgress }) => {
    const {isDark} = useTheme();
    console.log(file);
    return (
        <div className={`relative flex items-center space-x-2 bg-gray-100 p-2 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            {file.fileType === 'image' ? (
                <img
                    src={file.fileUrl}
                    alt={file.fileName}
                    className="w-12 h-12 rounded-lg object-cover"
                />
            ) : (
                <div className={`w-fit h-12 bg-gray-200 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
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
                    <div className={`w-full bg-gray-200 rounded-full h-2 mt-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
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
    const { isDark } = useTheme();
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
    const popoverRef = useRef(null);
    const [friendIds, setFriendIds] = useState([]);
    const [showAddFriendButton, setShowAddFriendButton] = useState(true);
    const [buttonText, setButtonText] = useState('Add Friend');
    const [localConversation, setLocalConversation] = useState(conversation);
    const [buttonState, setButtonState] = useState('add');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isSearchVisible, setIsSearchVisible] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [currentResultIndex, setCurrentResultIndex] = useState(0);
    const searchInputRef = useRef(null);


    useEffect(() => {
        const getFriendList = async () => {
            if (!currentUser) return;
            try {
                const response = await axios.get(`http://localhost:5000/api/friends/friendList`, {
                    headers: {
                        Authorization: `Bearer ${currentUser.token}`,
                    }
                });
                const acceptedFriendIds = response.data.data
                    .filter(friendship => friendship.status === 'accepted')
                    .map(friendship =>
                        friendship.requester._id === currentUser._id
                            ? friendship.recipient._id
                            : friendship.requester._id
                    );
                setFriendIds(acceptedFriendIds);
            } catch (error) {
                console.log("Get friends failed: ", error);
            }
        }
        getFriendList();
    }, [currentUser]);

    // Improved scroll to bottom function with smooth behavior
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'end',
            });
        }
    }, []);


    useEffect(() => {
        const timeoutId = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timeoutId);
    }, [messages]);
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
                const isFriend = friendIds.includes(otherParticipant._id);
                setOtherParticipant(otherParticipant);
                setConversationHeader({
                    title: otherParticipant.name || 'Unknown Contact',
                    subtitle: otherParticipant.status === 'online'
                        ? 'Online'
                        : `Active ${fomatLastActive(otherParticipant.lastActive, otherParticipant.status)}`,
                    avatar: otherParticipant.avatar || img1,
                    subtitleColor: otherParticipant.status === 'online' ? 'green' : 'gray',
                    isFriend: isFriend
                });
            }
        } else if (conversation.type === 'group') {
            setConversationHeader({
                title: conversation.name || 'Group',
                subtitle: `${conversation.participants?.length || 0} members`,
                avatar: conversation.avatarGroup,
                subtitleColor: 'green'
            });
        }
    }, [conversation, friendIds]);

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
    }, [socket, handleUserStatusChange, conversation?._id]);

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

        const handleMessageStatusUpdate = (updatedMessages) => {
            setMessages(prev =>
                prev.map(msg => {
                    const updatedMsg = updatedMessages.find(
                        u => u._id === msg._id &&
                            u.conversationId === conversation._id
                    );
                    if (updatedMsg) {
                        return {
                            ...msg,
                            status: updatedMsg.status,
                            readAt: updatedMsg.readAt,
                            readBy: updatedMsg.readBy
                        };
                    }
                    return msg;
                })
            );
        };

        socket.on('message:status-updated', handleMessageStatusUpdate);

        const handleNewMessage = (newMessage) => {
            if (
                newMessage.conversationId === conversationId &&
                newMessage.sender._id !== currentUser._id
            ) {
                socket.emit('message:read', conversationId);
            }
        };

        socket.on('new:message', handleNewMessage);


        return () => {
            socket.off('message:status-updated', handleMessageStatusUpdate);
            socket.off('new:message', handleNewMessage);
        };
    }, [socket, conversation?._id, currentUser._id]);

    const getPersonalizedContent = useCallback((message) => {
        if (!message || !currentUser) return message?.content;

        const personalizedMsg = message.personalizedContent?.find(
            pc => pc.userId.toString() === currentUser._id.toString()
        );
        return personalizedMsg?.content || message.content;
    }, [currentUser]);

    useEffect(() => {
        if (!socket || !conversation) return;

        const conversationId = conversation._id.toString();

        socket.emit('join:conversation', conversationId);

        const handleMessage = (newMessage) => {
            if (newMessage.conversationId === conversationId || newMessage.type === 'system') {

                setMessages((prevMessages) => {

                    const updatedMessage = {
                        ...newMessage,
                        _id: newMessage._id || new Date().getTime().toString(),
                        content: getPersonalizedContent(newMessage),
                        sender: newMessage.sender,
                        createdAt: newMessage.createdAt || new Date(),
                        conversationId: newMessage.conversationId,
                        type: newMessage.type || (newMessage.isSystemMessage ? 'system' : 'text'),
                        isSystemMessage: newMessage.type === 'system' || newMessage.isSystemMessage
                    };

                    const newMessages = [...prevMessages, updatedMessage];
                    setTimeout(scrollToBottom, 100);
                    return newMessages;
                });
            }
        };

        socket.on('messages:list', (allMessages) => {
            setMessages(allMessages.map(msg => ({
                ...msg,
                content: getPersonalizedContent(msg),
                isSystemMessage: msg.type === 'system' || msg.isSystemMessage
            })));
            setTimeout(scrollToBottom, 100);
        });

        socket.on('new:message', handleMessage);

        const handleGroupUpdate = (updatedGroup) => {
            if (updatedGroup._id === conversation._id) {
                console.log('Group updated:', updatedGroup);
                setConversationHeader(prev => ({
                    ...prev,
                    subtitle: updatedGroup.participants
                        ? `${updatedGroup.participants.length} members`
                        : prev.subtitle,
                    title: updatedGroup.name,
                    avatar: updatedGroup.avatarGroup
                }));

                if (updatedGroup.lastMessage) {
                    const personalizedContent = getPersonalizedContent(updatedGroup.lastMessage);
                    setLocalConversation(prev => ({
                        ...prev,
                        ...updatedGroup,
                        lastMessage: {
                            ...updatedGroup.lastMessage,
                            content: personalizedContent
                        }
                    }))
                }
            }
        };

        socket.on('group:updated', handleGroupUpdate);

        // Cleanup
        return () => {
            socket.off('messages:list');
            socket.off('new:message', handleMessage);
            socket.off('group:updated', handleGroupUpdate);
            socket.emit('leave:conversation', conversationId);
        };
    }, [socket, conversation?._id, scrollToBottom]);

    useEffect(() => {
        if (!socket) return;

        socket.on('message:reaction-updated', ({ messageId, reactions }) => {
            setMessages(prevMessages =>
                prevMessages.map(msg => {
                    if (msg._id === messageId) {
                        return { ...msg, reactions };
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

        if (unreadMessages.length > 0) {
            socket.emit('message:read', conversation._id);
        }
    }, [messages, conversation?._id, currentUser._id, socket]);

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

            const token = localStorage.getItem('token');

            const response = await axios.post("http://localhost:5000/api/upload/multiple", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
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
            createdAt: new Date(),
            replyTo: replyingTo ? replyingTo._id : null,
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
                        msg.tempId === messageToSend.tempId ? {
                            ...serverMessage,
                            replyTo: replyingTo?._id,
                        } : msg
                    )
                );
            }
            );
        
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
                            msg._id === newMessage._id ? {
                                ...newMessage,
                                replyTo: msg.replyTo || newMessage.replyTo
                            } : msg
                        );
                    }
                    return [...prev, {
                        ...newMessage,
                        replyTo: newMessage.replyTo
                    }];
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
            <div className={`p-2 rounded-t-lg text-sm text-gray-600 border-l-2 border-blue-500 ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}>
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

    const renderSystemMessge = (message) => {
        const messageContent = getPersonalizedContent(message);
        return (
            <div key={message._id} className="flex justify-center my-4">
                <div className={`px-4 py-2 rounded-full text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                    {messageContent}
                </div>
            </div>
        )
    }


    const renderMessage = (msg, index) => {
        if (msg.type === 'system' || msg.isSystemMessage) {
            return renderSystemMessge(msg);
        }
        const isOwnMessage = msg.sender._id === currentUser._id;
        const isHighlighted = searchResults.length > 0 &&
            currentResultIndex >= 0 &&
            searchResults[currentResultIndex]._id === msg._id;

        return (
            <div
                id={`message-${msg._id || index}`}
                key={msg._id || index}
                className={`flex items-start ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4 
                ${isHighlighted ? 'bg-blue-200/20 rounded-lg transition-colors duration-500' : ''}`}
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
                        {isOwnMessage && !msg.isRecalled && (
                            <>
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
                                <button
                                    onClick={() => handleRecall(msg)}
                                    className="p-1.5 rounded-full hover:bg-gray-100"
                                >
                                    <FaTrash className="w-3 h-3 text-gray-500" />
                                </button>
                            </>
                        )}
                        {!isOwnMessage && !msg.isRecalled && (
                            <>
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
                            </>
                        )}
                    </div>

                    <div className={`group flex ${isOwnMessage ? 'justify-end' : 'justify-start'} items-start relative`}>
                        {!isOwnMessage && (
                            <img
                                src={msg.sender.avatar}
                                alt={msg.sender.name}
                                className="rounded-full w-8 h-8 mr-3 flex-shrink-0"
                            />
                        )}

                        <div className="flex flex-col relative">
                            {renderReplyPreview(msg)}

                            <div className={`p-3 rounded-lg ${msg.isRecalled
                                ? isDark ? 'bg-gray-500' : 'bg-gray-200'
                                : isOwnMessage
                                    ? (msg.type === 'text' ? 'bg-blue-500 text-white' : '')
                                    : isDark ? 'bg-gray-700' : 'bg-gray-200'
                                }`}>
                                <div className="break-words whitespace-pre-line">
                                    {msg.isRecalled ? (
                                        msg.recallType === 'everyone' ? (
                                            isOwnMessage ? (
                                                <span className={`${isDark ? 'text-white' : 'text-gray-500'} italic`}>You have recalled</span>
                                            ) : (
                                                <span className={`${isDark ? 'text-white' : 'text-gray-500'} italic`}>{msg.sender.name} has recalled</span>
                                            )
                                        ) : msg.recallType === 'self' && isOwnMessage ? (
                                            <span className={`${isDark ? 'text-white' : 'text-gray-500'} italic`}>You have recalled</span>
                                        ) : (
                                            <div className="break-all">
                                                {renderMessageContent(msg)}
                                            </div>
                                        )
                                    ) : (
                                        <div className="break-all">
                                            {renderMessageContent(msg)}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className={`absolute mt-1 ${isOwnMessage ? (
                                msg.reactions.length === 1 ? 'top-8 -left-4' : 'top-9 -left-6'
                            ) : 'top-7 -right-3'}`}>
                                <MessageReactions
                                    message={msg}
                                    currentUser={currentUser}
                                    onReact={(emoji) => handleReaction(msg._id, emoji)}
                                    existingReactions={msg.reactions || []}
                                    onRemoveReaction={(emoji) => handleRemoveReaction(emoji, msg._id)}
                                />
                            </div>

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
                                className="rounded-full w-8 h-8 ml-3 flex-shrink-0"
                            />
                        )}
                    </div>
                    {isOwnMessage && index === messages.length - 1 && (
                        <div className="flex justify-end mt-1 mr-10">
                            {renderMessageStatus(msg, index === messages.length - 1)}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const isImageFile = (fileType) => {
        return fileType === 'image';
    }


    const handleFileClick = (file) => {
        if (isImageFile(file.fileType)) {
            setSelectedImage({
                url: file.fileUrl,
                fileName: file.fileName
            })
        }
    }

    const renderMessageContent = (message) => {
        const truncateFileName = (fileName, maxLength = 30) => {
            if (fileName.length <= maxLength) return fileName;

            const extension = fileName.split('.').pop();
            const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));

            const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);

            return `${truncatedName}...${extension}`;
        }
        const handleFileDownload = async (fileUrl, fileName) => {
            try {
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download failed:', error);
                showAlert('File download failed', 'error');
            }
        };

        if (message.type === 'multimedia' && message.attachments && message.attachments.length > 0) {
            return (
                <div className="max-w-full">
                    {message.attachments.map((file, index) => {
                        switch (file.fileType) {
                            case 'image':
                                return (
                                    <div
                                        key={index}
                                        className="max-w-full cursor-pointer"
                                        onClick={() => handleFileClick(file)}
                                    >
                                        <img
                                            src={file.fileUrl}
                                            alt={file.fileName}
                                            className="h-44 w-60 rounded-t-lg mt-2"
                                            onContextMenu={(e) => e.preventDefault()}
                                            onError={(e) => {
                                                console.error('Image failed to load:', file.fileUrl);
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                        {message.content && <p className="text-sm bg-blue-500 text-white w-full text-end py-1 px-3 rounded-b-lg break-words">{message.content}</p>}
                                    </div>
                                );

                            default:
                                return (
                                    <div
                                        key={index}
                                        className={`flex items-center space-x-2 bg-gray-100 p-2 rounded-lg mt-2 max-w-full text-black ${isDark ? 'bg-gray-700 text-white' : 'bg-gray-100'}`}
                                        title={file.fileName}
                                        onClick={() => handleFileDownload(file.fileUrl, file.fileName)}
                                    >
                                        <div className="flex items-center w-full overflow-hidden">
                                            <div className="mr-2">
                                                {getFileIcon(file?.fileType)}
                                            </div>
                                            <p className="text-[14px] font-semibold py-1 rounded-xl truncate">
                                                {truncateFileName(file.fileName)}
                                            </p>
                                        </div>
                                    </div>
                                );
                        }
                    })}
                </div>
            );
        }
        return (
            <div className="max-w-full">
                <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
            </div>
        );
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
            read: 'text-gray-500',
            delivered: 'text-gray-500',
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
        if (conversation.type === 'group') {
            const readByUsers = message.readBy || [];

            const readByOthers = readByUsers.filter(read =>
                read.user._id !== currentUser._id &&
                read.user._id !== message.sender._id
            );

            if (readByOthers.length === 0) {
                return (
                    <div className={`text-xs font-serif ${statusColors['sent']} flex items-center`}>
                        <IoIosCheckmark className="text-xl" />
                        Sent
                    </div>
                )
            }

            const firstReaders = readByOthers.slice(0, 2);
            const remainingCounts = readByOthers.length - 2;

            const readerName = firstReaders
                .map(read => read.user.name)
                .filter(Boolean)
                .join(', ');

            if (!readerName) {
                return (
                    <div className={`text-xs font-serif ${statusColors['sent']} flex items-center`}>
                        <IoIosCheckmark className="text-xl" />
                        Sent
                    </div>
                );
            }

            return (
                <div className={`text-xs font-serif ${statusColors['read']} flex items-center`}>
                    <IoIosCheckmark className="text-xl" />
                    Read by {readerName}
                    {remainingCounts > 0 ? ` and ${remainingCounts} others` : ''}
                    {` at ${formatMessageTime(readByOthers[0].readAt)}`}
                </div>
            )
        }
        const readByOthers = (message.readBy || []).filter(read =>
            read.user._id !== currentUser._id &&
            read.user._id !== message.sender._id
        );
        if (readByOthers.length === 0) {
            return (
                <div className={`text-xs font-serif ${statusColors['sent']} flex items-center`}>
                    <IoIosCheckmark className="text-xl" />
                    Sent
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

    useEffect(() => {
        if (!socket) return;

        const handleConversationUpdated = (updatedConversation) => {
            if (localConversation?._id === updatedConversation._id) {
                setLocalConversation(prev => ({
                    ...prev,
                    ...updatedConversation
                }));
            }
        };

        socket.on('conversation:updated', handleConversationUpdated);

        socket.on('friendRequestSent', () => {
            setLocalConversation(prev => ({
                ...prev,
                friendRequestStatus: 'pending',
                isFriendshipPending: true
            }));
            setShowAddFriendButton(true);
            setButtonText('Recall request');
            showAlert('Friend request sent', 'success');
        });

        socket.on('friendRequestCancelled', () => {
            setLocalConversation(prev => ({
                ...prev,
                friendRequestStatus: 'recalled',
                isFriendshipPending: true
            }));

            setShowAddFriendButton(true);
            setButtonText('Add friend');
            showAlert('Friend request cancelled', 'success');
        });

        return () => {
            socket.off('conversation:updated', handleConversationUpdated);
            socket.off('friendRequestSent');
            socket.off('friendRequestCancelled');
        };
    }, [socket, localConversation, showAlert]);

    useEffect(() => {
        if (conversation.isFriendshipPending) {
            setButtonState(
                conversation.friendRequestStatus === 'pending' ? 'recall' : 'add'
            )
        }
    }, [conversation]);

    const handleAddFriend = (friendId) => {
        if (socket) {

            if (buttonState === 'recall') {
                socket.emit('cancelFriendRequest', {
                    requesterId: currentUser._id,
                    recipientId: friendId,
                })
                setButtonState('add');
            } else {
                socket.emit('sendFriendRequest', {
                    requesterId: currentUser._id,
                    recipientId: friendId,
                })
                setButtonState('recall');
            }
        }
    }

    useEffect(() => {
        setIsSearchVisible(false);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentResultIndex(0);
        // setHasSearched(false);
    }, [conversation]);
    useEffect(() => {
        if (socket) {
            socket.on('toggle_search', (data) => {
                if (data.conversationId === conversation._id) {
                    setIsSearchVisible(data.isOpen);
                    if (data.isOpen) {
                        setTimeout(() => {
                            searchInputRef.current?.focus();
                        }, 100);
                    } else {
                        setSearchQuery('');
                        setSearchResults([]);
                    }
                }
            });

            return () => {
                socket.off('toggle_search');
            };
        }
    }, [socket, conversation]);

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const query = searchQuery.toLowerCase();
        const results = messages.filter(msg =>
            msg.type === 'text' &&
            !msg.isRecalled &&
            msg.content &&
            msg.content.toLowerCase().includes(query)
        );

        setSearchResults(results);
        setCurrentResultIndex(results.length > 0 ? 0 : -1);

        if (results.length > 0) {
            scrollToMessage(results[0]._id);
        }
    };

    const scrollToMessage = (messageId) => {
        const messageElement = document.getElementById(`message-${messageId}`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            messageElement.classList.add('bg-blue-200/20', 'rounded-lg');
            setTimeout(() => {
                messageElement.classList.remove('bg-blue-200/20');
            }, 2000);
        }
    };

    const navigateResults = (direction) => {
        if (searchResults.length === 0) return;

        let newIndex;
        if (direction === 'up') {
            newIndex = currentResultIndex > 0 ? currentResultIndex - 1 : searchResults.length - 1;
        } else {
            newIndex = currentResultIndex < searchResults.length - 1 ? currentResultIndex + 1 : 0;
        }

        setCurrentResultIndex(newIndex);
        scrollToMessage(searchResults[newIndex]._id);
    };

    const renderSearchBar = () => {
        if (!isSearchVisible) return null;

        return (
            <div className={`flex items-center px-4 py-2 space-x-2 border-b ${isDark ? 'border-gray-700 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>
                <div className="flex-1 relative flex items-center">
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search in conversation..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className={`w-full py-2 px-4 pr-24 rounded-full ${isDark ? 'bg-gray-600 text-white' : 'bg-white text-black'} focus:outline-none`}
                    />

                    {searchResults.length > 0 && (
                        <div className="absolute right-3 flex items-center">
                            <span className={`text-sm mr-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                {currentResultIndex + 1} of {searchResults.length}
                            </span>
                            <button
                                onClick={() => navigateResults('up')}
                                className={`p-1 rounded-full ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-200'}`}
                                title="Previous result"
                            >
                                <HiChevronUp className="text-blue-500" />
                            </button>
                            <button
                                onClick={() => navigateResults('down')}
                                className={`p-1 rounded-full ${isDark ? 'hover:bg-gray-500' : 'hover:bg-gray-200'}`}
                                title="Next result"
                            >
                                <HiChevronDown className="text-blue-500" />
                            </button>
                        </div>
                    )}
                </div>

                <button
                    onClick={() => {
                        setIsSearchVisible(false);
                        setSearchQuery('');
                        setSearchResults([]);
                        socket.emit('toggle_search', {
                            conversationId: conversation._id,
                            isOpen: false
                        });
                    }}
                    className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                    title="Close search"
                >
                    <HiX className="text-gray-500" />
                </button>
            </div>
        );
    };

    return (
        <div className={`h-full flex flex-col rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            <div className={`py-2 flex space-x-10 px-5 flex-none items-center justify-between mt-3 border-b-2 ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
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
                                    <span>{conversationHeader.subtitle}</span>
                                </div>
                            </p>
                        </div>
                    </div>
                </div>
                {conversation.type === 'private' && showAddFriendButton &&
                    conversation.isFriendshipPending ?
                    (
                        <button
                            className={`text-white rounded-lg px-2 text-sm font-semibold ${buttonState === 'recall'
                                ? "bg-red-400 hover:bg-red-300 transition-colors duration-300"
                                : "bg-blue-400 hover:bg-blue-300 transition-colors duration-300"
                                }`}
                            onClick={() => handleAddFriend(conversation.otherParticipant._id)}
                        >
                            {buttonState === 'recall' ? 'Recall request' : 'Add friend'}
                        </button>
                    )
                    : null}

            </div>
            {renderSearchBar()}
            <div className="flex-1 overflow-y-auto p-4" style={{ height: 'auto' }}>
                {searchResults.length === 0 && searchQuery && (
                    <div className={`text-center py-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        No results found for "{searchQuery}"
                    </div>
                )}
                <div className="space-y-4">
                    {messages.map((msg, index) => renderMessage(msg, index))}
                </div>
                <div ref={messagesEndRef} />
            </div>
            {replyingTo && (
                <div className={`px-4 py-2  flex items-center justify-between ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold">
                            Replying to {replyingTo.sender.name}
                        </span>
                        <span className={`text-sm text-gray-700 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
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
                    className={`${isDark ? 'bg-gray-600' : 'bg-slate-100'} w-full p-2 rounded-lg focus:outline-none`}
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
            <ImagePreviewModal
                isOpen={!!selectedImage}
                onClose={() => setSelectedImage(null)}
                imageUrl={selectedImage?.url}
                fileName={selectedImage?.fileName}
            />
        </div>
    );
};

export default ChatWindow;