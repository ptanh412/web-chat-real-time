import { useState } from 'react';
import { MdOutlineEmail } from 'react-icons/md';
import { CiLock } from 'react-icons/ci';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useContext } from 'react';
import { AlertContext } from '../context/AlertMessage';
import { useUser } from '../context/UserContext.js';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import {jwtDecode} from 'jwt-decode';
const Login = () => {
    const { setUser, socket } = useUser();
    const { alertMessage, alertType, showAlert } = useContext(AlertContext);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [tab, setTab] = useState(0);
    const [name, setName] = useState("");

    const navigation = useNavigate();
    const handleTab = (index) => {
        setTab(index);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
    };
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/api/users/login", {
                email,
                password,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            if (response.status === 200) {
                const { token, name, avatar, status, _id, lastActive, email, phoneNumber, about } = response.data.data;
                localStorage.setItem("token", token);
                localStorage.setItem("name", name);
                localStorage.setItem("avatar", avatar);
                localStorage.setItem("status", 'online');
                localStorage.setItem("userId", _id);
                localStorage.setItem("lastActive", lastActive);
                localStorage.setItem("email", email);
                localStorage.setItem("phoneNumber", phoneNumber);
                localStorage.setItem("about", about);

                setUser(prevUser => ({
                    ...prevUser,
                    _id,
                    name,
                    email,
                    phoneNumber,
                    about,
                    avatar: avatar || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1734411009/Chat/1734411118923_blank-profile-picture-973460_1280.png.png',
                    status: 'online',
                    token,
                    lastActive: new Date().toISOString()
                }));

                if (socket) {
                    socket.emit('user:online', {
                        _id,
                        status: 'online',
                        lastActive: new Date(),
                        name,
                        avatar
                    });
                }
                navigation("/chat");
                showAlert(response.data.message, "success");
            } else {
                showAlert("Invalid email or password", "error");
            }
        } catch (error) {
            console.log(error);
            showAlert("Error", "error");
        }
    }
    const handleRegister = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert("Password and confirm password do not match");
            return;
        }
        const response = await axios.post("http://localhost:5000/api/users/register", {
            name,
            email,
            password,
        }, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        if (response.data.success) {
            showAlert(response.data.message, "success");
            handleTab(0);
            setTab(0);
        } else {
            showAlert("Register failed", "error");
        }
    }
    const handleGoogleLogin = async (credentialResponse) => {
        try {
            const decode = jwtDecode(credentialResponse.credential);
            const response = await axios.post("http://localhost:5000/api/auth/google", {
                token: credentialResponse.credential,
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            })
            if (response.status === 200) {
                const { token, name, avatar, status, _id, lastActive, email, phoneNumber, about } = response.data.data;
                localStorage.setItem("token", token);
                localStorage.setItem("name", name);
                localStorage.setItem("avatar", avatar);
                localStorage.setItem("status", 'online');
                localStorage.setItem("userId", _id);
                localStorage.setItem("lastActive", lastActive);
                localStorage.setItem("email", email);
                localStorage.setItem("phoneNumber", phoneNumber);
                localStorage.setItem("about", about);

                setUser(prevUser => ({
                    ...prevUser,
                    _id,
                    name,
                    googleId: decode.sub,
                    email,
                    phoneNumber,
                    about,
                    avatar: avatar || 'https://res.cloudinary.com/doruhcyf6/image/upload/v1734411009/Chat/1734411118923_blank-profile-picture-973460_1280.png.png',
                    status: 'online',
                    token,
                    lastActive: new Date().toISOString()
                }));

                if (socket) {
                    socket.emit('user:online', {
                        _id,
                        status: 'online',
                        lastActive: new Date(),
                        name,
                        avatar
                    });
                }
                navigation("/chat");
                showAlert(response.data.message, "success");
            } else {
                showAlert("Invalid email or password", "error");
            }
        } catch (error) {
            console.log(error);
            showAlert("Error", "error");
        }
    }
    return (
        <GoogleOAuthProvider
            clientId='872952353931-e5un5cbh4l5hlf5puqs2lif8ja32jm1b.apps.googleusercontent.com'
        >
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-[#D3A29D] via-[#A36361] via-[#E8B298] via-[#EECC8C] via-[#8DD1C5] to-[#9EABA2] animate-gradient-x">
                {alertMessage && (
                    <div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
                        <span className="text-center flex justify-center w-full items-center space-x-1 px-5">
                            {alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                            <p className="text-sm">{alertMessage}</p>
                        </span>
                    </div>
                )}
                <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg bg-white">
                    <div className="relative grid grid-cols-2 text-lg w-full bg-gray-300 rounded-t-lg overflow-hidden">
                        <div
                            className={`absolute top-0 h-full w-1/2 bg-slate-950 transition-transform duration-1000 ${tab === 0 ? 'translate-x-0' : 'translate-x-full'
                                }`}
                        ></div>
                        <button
                            className={`relative z-10 py-2 font-semibold ${tab === 0 ? 'text-white' : 'text-black'
                                }`}
                            onClick={() => handleTab(0)}
                        >
                            Login
                        </button>
                        <button
                            className={`relative z-10 py-2 font-semibold ${tab === 1 ? 'text-white' : 'text-black'
                                }`}
                            onClick={() => handleTab(1)}
                        >
                            Register
                        </button>
                    </div>
                    {tab === 0 ? (
                        <form className="p-6" onSubmit={handleLogin}>
                            <h1 className="text-3xl font-bold mb-4 text-center text-black">Login</h1>
                            <p className="text-gray-400 text-center">Enter your account information to log in</p>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Email</label>
                                <div className="w-full relative">
                                    <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Password</label>
                                <div className="w-full relative">
                                    <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="password"
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                    />
                                </div>
                            </div>
                            <Link to="/forgot-password" className='line-clamp-1 mb-5 ml-1 text-sm underline text-black'> Forgot password?</Link>
                            <button
                                type="submit"
                                className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg hover:bg-slate-900"
                            >
                                Log in
                            </button>
                        </form>
                    ) : (
                        <form className="p-6" onSubmit={handleRegister}>
                            <h1 className="text-3xl font-bold mb-4 text-center text-black">Register</h1>
                            <p className="text-gray-400 text-center">Create a new account to use our services</p>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Name</label>
                                <div className="w-full relative">
                                    <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Enter your name..."
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Email</label>
                                <div className="w-full relative">
                                    <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="email"
                                        placeholder="email@example.com"
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Password</label>
                                <div className="w-full relative">
                                    <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="password"
                                        placeholder="Password must be at least 8 characters, including uppercase, lowercase, numbers and special characters"
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col space-y-3 my-3">
                                <label className="text-xl font-semibold text-black">Confirm Password</label>
                                <div className="w-full relative">
                                    <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                    <input
                                        type="password"
                                        placeholder="Re-enter password"
                                        className="border pl-7 py-2 rounded-lg w-full text-black"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg hover:bg-slate-900"
                            >
                                Register
                            </button>
                        </form>
                    )}
                    <div>
                        <GoogleLogin
                            onSuccess={handleGoogleLogin}
                            onError={() =>{
                                showAlert("Google login failed", "error");
                            }}
                        />
                    </div>
                </div>
            </div>
        </GoogleOAuthProvider>
    )
}

export default Login;