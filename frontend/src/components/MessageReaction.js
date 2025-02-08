import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';

const MessageReactions = ({ message, currentUser, onRemoveReaction, existingReactions = [] }) => {
    const { isDark } = useTheme();
    const [showReactionDetails, setShowReactionDetails] = useState(false);
    const [groupedReactions, setGroupedReactions] = useState({});
    const isOwnMessage = message.sender._id === currentUser._id;

    useEffect(() => {
        const processReactions = () => {
            const grouped = existingReactions.reduce((acc, reaction) => {
                if (!reaction || !reaction.emoji) return acc;

                const key = reaction.emoji;
                if (!acc[key]) {
                    acc[key] = {
                        emoji: key,
                        users: [],
                        count: 0,
                    };
                }

                // Kiểm tra và thêm thông tin user đầy đủ
                const user = reaction.user?._id ? reaction.user : {
                    _id: reaction.user,
                    name: 'Unknown',
                    avatar: 'https://www.gravatar.com/avatar/'
                };

                if (!acc[key].users.some(u => u._id === user._id)) {
                    acc[key].users.push({
                        _id: user._id,
                        name: user.name || 'Unknown',
                        avatar: user.avatar || 'https://www.gravatar.com/avatar/'
                    });
                }

                acc[key].count = acc[key].users.length;
                return acc;
            }, {});

            setGroupedReactions(grouped);
        };

        processReactions();
    }, [existingReactions]);


    const totalReactions = Object.values(groupedReactions).reduce((sum, { count }) => sum + count, 0);

    const handleRemoveReaction = (emoji, userId) => {
        onRemoveReaction(emoji, userId);
    }

    const ReactionDetailsModal = () => (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setShowReactionDetails(false)}
        >
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className={` rounded-lg p-6 max-w-md w-full mx-4 shadow-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-4 ">
                        <h3 className="text-lg font-semibold">Reactions</h3>
                        <button
                            onClick={() => setShowReactionDetails(false)}
                            className="text-gray-500 hover:bg-gray-100 rounded-full p-0.5"
                        >
                            <MdClose className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-4">
                        <div className={`text-sm text-gray-600 mb-4 ${isDark ? 'text-white' : ''}`}>
                            Total {totalReactions}
                        </div>
                        <div className="flex flex-wrap gap-4">
                            {Object.entries(groupedReactions).map(([emoji, { users, count }]) => (
                                <div key={emoji} className="mb-6">
                                    <div className=" items-center mb-2">
                                        <span className="text-xl mr-2">{emoji}</span>
                                        <span className={`text-sm  ${isDark ? 'text-white' : 'text-gray-600'}`}>{count}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {users.map(user => (
                                            <div
                                                key={`${emoji}-${user._id}`}
                                                className={`flex items-center justify-between  rounded-lg p-2 ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}
                                            >
                                                <div className="flex items-center">
                                                    <img
                                                        src={user.avatar}
                                                        alt={user.name}
                                                        className="w-8 h-8 rounded-full"
                                                    />
                                                    <span className="ml-3 text-sm">
                                                        {user._id === currentUser._id ? 'You' : user.name}
                                                    </span>
                                                </div>
                                                {user._id === currentUser._id && (
                                                    <button
                                                        onClick={() => handleRemoveReaction(emoji, user._id)}
                                                        className="text-gray-500 hover:bg-gray-200 rounded-full p-1 ml-5"
                                                    >
                                                        <MdClose className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>

            </div>
        </motion.div>
    );
    return (
        <div className="relative inline-flex items-center">
            {totalReactions > 0 && (
                <button
                    onClick={() => setShowReactionDetails(true)}
                    className="flex items-center ml-1 rounded-full truncate"
                >
                    <div className={` flex items-center overflow-hidden ${isOwnMessage ? 'mr-10' : ''}`}>
                        <span className="text-sm truncate">
                            {Object.keys(groupedReactions).map(emoji => emoji).join('')}
                        </span>
                        {totalReactions > 1 && (
                            <span className={`text-xs text-gray-600 ml-1 `}>
                                {totalReactions}
                            </span>
                        )}
                    </div>
                </button>
            )}

            <AnimatePresence>
                {showReactionDetails && <ReactionDetailsModal />}
            </AnimatePresence>
        </div>
    );
};

export default MessageReactions;