import { useState } from 'react';
import { MdOutlineEmail } from 'react-icons/md';
import { CiLock } from 'react-icons/ci';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [tab, setTab] = useState(0);
    const [name, setName] = useState("");
    const handleTab = (index) => {
        setTab(index);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
    };
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-t from-[#D3A29D] via-[#A36361] via-[#E8B298] via-[#EECC8C] via-[#8DD1C5] to-[#9EABA2] animate-gradient-x">
            {/* {alertMessage && (
            <div className={`fixed top-0 mx-auto transform left-[650px] py-1 ${alertType === 'success' ? "bg-green-100 border border-green-400 text-green-700" : "bg-red-100 border border-red-400 text-red-700"} rounded-lg mb-4 w-60 max-w-md text-center z-50 animate-slide-down`} role="alert">
                <span className="text-center flex justify-center w-full items-center space-x-1 px-5">
                    {alertType === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                    <p className="text-sm">{alertMessage}</p>
                </span>
            </div>
        )} */}
            <div className="w-full max-w-md mx-auto shadow-2xl rounded-lg bg-white">
                <div className="relative grid grid-cols-2 text-lg w-full bg-gray-300 rounded-t-lg overflow-hidden">
                    {/* Div di chuyển màu nền */}
                    <div
                        className={`absolute top-0 h-full w-1/2 bg-slate-950 transition-transform duration-1000 ${tab === 0 ? 'translate-x-0' : 'translate-x-full'
                            }`}
                    ></div>

                    {/* Nút Login */}
                    <button
                        className={`relative z-10 py-2 font-semibold ${tab === 0 ? 'text-white' : 'text-black'
                            }`}
                        onClick={() => handleTab(0)}
                    >
                        Login
                    </button>

                    {/* Nút Register */}
                    <button
                        className={`relative z-10 py-2 font-semibold ${tab === 1 ? 'text-white' : 'text-black'
                            }`}
                        onClick={() => handleTab(1)}
                    >
                        Register
                    </button>
                </div>
                {tab === 0 ? (
                    <form className="p-6">
                        <h1 className="text-3xl font-bold mb-4 text-center">Login</h1>
                        <p className="text-gray-400 text-center">Enter your account information to log in</p>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Email</label>
                            <div className="w-full relative">
                                <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Password</label>
                            <div className="w-full relative">
                                <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="password"
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter password"
                                />
                            </div>
                        </div>
                        <a href="" className='line-clamp-1 mb-5 ml-1 text-sm underline'> Forgot password?</a>
                        <button
                            className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg hover:bg-slate-900"
                            onClick=''
                        >
                            Log in
                        </button>
                    </form>
                ) : (
                    <form className="p-6">
                        <h1 className="text-3xl font-bold mb-4 text-center">Register</h1>
                        <p className="text-gray-400 text-center">Create a new account to use our services</p>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Name</label>
                            <div className="w-full relative">
                                <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="Enter your name..."
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Email</label>
                            <div className="w-full relative">
                                <MdOutlineEmail className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="email@example.com"
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Password</label>
                            <div className="w-full relative">
                                <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="password"
                                    placeholder="Password must be at least 8 characters, including uppercase, lowercase, numbers and special characters"
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col space-y-3 my-3">
                            <label className="text-xl font-semibold">Confirm Password</label>
                            <div className="w-full relative">
                                <CiLock className="absolute top-3.5 left-2 h-4 w-4 bottom-0 text-2xl text-gray-500" />
                                <input
                                    type="password"
                                    placeholder="Re-enter password"
                                    className="border pl-7 py-2 rounded-lg w-full"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            className="py-2 bg-slate-950 text-white w-full rounded-xl font-semibold text-lg hover:bg-slate-900"
                            onClick=''
                        >
                            Register
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default Login;