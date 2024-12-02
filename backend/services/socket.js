require('dotenv').config();
const dotenv = require('dotenv');  
// ../services/socket.js
const socket = io('http://localhost:3000', {
    auth:{
        token: process.env.JWT_SECRET_KEY
    }
})

socket.on('connect', () =>{
    console.log('Connected to socket server');
});

socket.on('updatePassword', (data) =>{
    console.log("update password: ",data.message);
});