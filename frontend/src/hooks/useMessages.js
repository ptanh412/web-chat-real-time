// import { useState, useEffect } from 'react';
// import { io } from 'socket.io-client';
// import { useCallback } from 'react';
// const useMessages = (conservationId) => {
//     const [messages, setMessages] = useState([]);
//     const [newMessage, setNewMessage] = useState("");
//     const [socket, setSocket] = useState(null);
//     const [loading, setLoading] = useState(true);
//     const [error, setError] = useState(null);

//     useEffect(() => {
//         const token = localStorage.getItem("token");
//         if(!token){
//             setError("Authentication required");
//             return;
//         }
//         const socketConnection = io("http://localhost:5000", {
//             auth: {
//                 token,
//             },
//         });
//         socketConnection.on("connect", () =>{
//             console.log("Connected to server");
//             if (conservationId){
//                 socketConnection.emit("join:conservation", conservationId);
//             }
//         })
//         socketConnection.on("error", (error) => {
//             setError("Failed to connect to server");
//             console.error('Socket error:', error);
//         });
//         setSocket(socketConnection);

//         return () => {
//             if(conservationId){
//                 socketConnection.emit("leave:conservation", conservationId);
//             }
//             socketConnection.disconnect();
//         }
//     }, [conservationId]);
//     useEffect(() => {
//         const fetchMessage = async ()=>{
//             try {
//                 const token = localStorage.getItem("token");
//                 const response = await fetch(`http://localhost:5000/messages/${conservationId}`, {
//                     headers: {
//                         Authorization: `Bearer ${token}`,
//                     },
//                 });
//                 if (!response.ok) {
//                     throw new Error("Failed to fetch messages");
//                 }
//                 const data = await response.json();
//                 setMessages(data.data);
//             } catch (error) {
//                 setError(false);
//             }finally{
//                 setLoading(false);
//             }
//         }
//         if (conservationId){
//             fetchMessage();
//         }   
//     }, [conservationId]);
//     useEffect(() =>{
//         if (!socket){
//             return;
//         }

//         socket.on('message:sent', (message) => {
//             setMessages((prevMessages) => [...prevMessages, message]);
//         });

//         socket.on('message:read' , ({ messageId, userId }) => {
//             setMessages((prevMessages) => {
//                 return prevMessages.map((message) => {
//                     if (message._id === messageId){
//                         return { ...message, status: "read" };
//                     }
//                     return message;
//                 });
//             });
//         });
//         socket.on('message:received', ({ messageId }) => {
//             setMessages(prevMessages =>
//                 prevMessages.map(msg =>
//                     msg._id === messageId ? { ...msg, status: 'received' } : msg
//                 )
//             );
//         });
//         return () => {
//             socket.off('message:sent');
//             socket.off('message:read');
//             socket.off('message:received');
//         };
//     }, [socket]);
//     const sendMessage = useCallback(async () => {
//         if (!newMessage.trim() || !socket) return;

//         try {
//             socket.emit('message:send', {
//                 conservationId,
//                 content: newMessage.trim(),
//                 type: 'text'
//             });

//             setNewMessage("");
//         } catch (err) {
//             setError('Failed to send message');
//             console.error('Send message error:', err);
//         }
//     }, [newMessage, conservationId, socket]);

//     // Đánh dấu tin nhắn đã đọc
//     const markMessageAsRead = useCallback((messageId) => {
//         if (!socket) return;
//         socket.emit('message:read', messageId);
//     }, [socket]);

//     // Handle input change
//     const handleNewMessageChange = useCallback((e) => {
//         setNewMessage(e.target.value);
//     }, []);

//     return {
//         messages,
//         newMessage,
//         loading,
//         error,
//         handleNewMessageChange,
//         sendMessage,
//         markMessageAsRead
//     };
// }
// export default useMessages;