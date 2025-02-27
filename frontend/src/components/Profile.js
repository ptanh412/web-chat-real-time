import React, { useState, useRef, useEffect, useContext } from 'react';
import { useUser } from '../context/UserContext';
import { FaFacebook, FaInstagram, FaUser, FaUsers } from 'react-icons/fa';
import { CiEdit, CiTwitter } from 'react-icons/ci';
import axios from 'axios';
import { AlertContext } from '../context/AlertMessage';
import { CiCamera } from "react-icons/ci";
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const Conversations = () => {
	const { isDark } = useTheme();
	const [conversations, setConversations] = useState([]);
	const { user, socket } = useUser();
	const [activeTab, setActiveTab] = useState('friends');
	const navigate = useNavigate();

	useEffect(() => {
		if (!socket) {
			console.error("Socket not available");
			return;
		}
	}, [socket]);

	useEffect(() => {
		if (!socket || !user?._id) {
			console.error("Socket or user ID is missing.");
			return;
		}
		socket.emit('get:conversations', user._id);

		socket.on('conversations:list', (conversations) => {
			console.log('Fetched conversations:', conversations);
			setConversations(conversations || []);
		});

		return () => {
			socket.off('conversations:list');
		};
	}, [socket, user?._id]);

	const filteredConversations = conversations.filter((conversation) =>
		activeTab === 'friends' ? conversation.type === 'private' : conversation.type === 'group'
	)

	const handleSendMessage = (conversation) => {
		navigate('/chat', {
			state: {
				conversation,
				currentUser: user
			},
			replace: true
		});
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center mb-6">
				<h2 className="text-xl font-bold">Conversations</h2>
				<div className="flex space-x-2">
					<button
						onClick={() => setActiveTab('friends')}
						className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'friends'
							? 'bg-blue-500 text-white'
							: `${isDark ? 'bg-gray-700' : 'bg-gray-200'}`
							}`}
					>
						<FaUser className="mr-2" />
						Friends
					</button>
					<button
						onClick={() => setActiveTab('groups')}
						className={`flex items-center px-4 py-2 rounded-lg transition-colors ${activeTab === 'groups'
							? 'bg-blue-500 text-white'
							: `${isDark ? 'bg-gray-700' : 'bg-gray-200'}`
							}`}
					>
						<FaUsers className="mr-2" />
						Groups
					</button>
				</div>
			</div>
			<div className="grid grid-cols-2 gap-4">
				{filteredConversations.map((conversation) => (
					<div
						key={conversation._id}
						className={`flex items-center justify-between p-4 rounded-lg ${isDark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
							} transition-colors duration-300 cursor-pointer`}
						onClick={() => handleSendMessage(conversation)}
					>
						<div className="flex items-center space-x-3">
							<div className="relative">
								<img
									src={conversation.type === 'private'
										? conversation.otherParticipant?.avatar
										: conversation.avatarGroup}
									alt="Avatar"
									className="w-12 h-12 rounded-full object-cover"
								/>
								<span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${conversation.type === 'private' && conversation.otherParticipant?.status === 'online'
									? 'bg-green-500'
									: 'bg-gray-400'
									}`}></span>
							</div>
							<div>
								<h3 className="font-medium">
									{conversation.type === 'private'
										? conversation.otherParticipant?.name
										: conversation.name}
								</h3>
								<p className="text-sm text-gray-500">
									{conversation.type === 'private'
										? conversation.otherParticipant?.status === 'online'
											? 'Online'
											: 'Offline'
										: `${conversation.participants?.length || 0} members`}
								</p>
							</div>
						</div>
						<div className={`px-3 py-1 rounded-full text-xs ${isDark ? 'bg-gray-600' : 'bg-gray-200'
							}`}>
							{conversation.type === 'private' ? 'Send message' : 'Send message'}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
const Profile = () => {
	const { isDark } = useTheme();
	const { user, updateUser } = useUser();
	const [isUploading, setIsUploading] = useState(false);
	const [showChangePassword, setShowChangePassword] = useState(false);
	const { showAlert } = useContext(AlertContext);
	const [editStates, setEditStates] = useState({
		avatar: false,
		about: false,
		phoneNumber: false,
		email: false,
	});
	const [formData, setFormData] = useState({
		avatar: '',
		about: '',
		phoneNumber: '',
		email: ''
	});
	const isGoogleUser = user?.googleId;

	const handleUploadClick = () => {
		const fileInput = document.getElementById('file-input');
		fileInput.click();
	}

	useEffect(() => {
		setFormData({
			avatar: user?.avatar || '',
			about: user?.about || '',
			phoneNumber: user?.phoneNumber || '',
			email: user?.email || ''
		})
	}, [user])


	const handleEdit = (field) => {
		setEditStates((prev) => ({
			...prev,
			[field]: true
		}))
		setFormData((prev) => ({
			...prev,
			[field]: user[field] || ''
		}))
	}

	const handleCancel = (field) => {
		setEditStates((prev) => ({
			...prev,
			[field]: false
		}))

		setFormData((prev) => ({
			...prev,
			[field]: user[field] || ''
		}))
	}

	const handleSave = async (field) => {

		try {
			const response = await axios.put('http://localhost:5000/api/users/update-profile', {
				[field]: formData[field]
			},
				{
					headers: {
						'Authorization': `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					}
				}
			)
			if (response.status === 200) {
				updateUser({
					...user,
					[field]: formData[field]
				})

				setEditStates(prev => ({
					...prev,
					[field]: false
				}))
				showAlert("Profile updated successfully", "success");
			}
		} catch (error) {
			console.error("Update profile error: ", error);
			alert(error.response?.data?.message || "Update failed");
		}
	}

	const handleAvatarChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;
		const tempAvatar = URL.createObjectURL(file);
		updateUser({
			...user,
			avatar: tempAvatar
		})
		showAlert("Avatar updated successfully", "success");
		const formData = new FormData();
		formData.append('file', file);

		setIsUploading(true);

		try {
			const response = await axios.post('http://localhost:5000/api/upload/upload-avatar', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'Authorization': `Bearer ${user.token}`
				}
			})
			if (response.status === 200) {
				const avatarUrl = response.data.fileUrl;
				const updateResponse = await axios.put('http://localhost:5000/api/users/update-profile', {
					avatar: avatarUrl
				},
					{
						headers: {
							'Authorization': `Bearer ${user.token}`,
							'Content-Type': 'application/json'
						}
					}
				)
				if (updateResponse.status === 200) {
					updateUser({
						...user,
						avatar: avatarUrl
					})
					// showAlert("Avatar updated successfully", "success");
				}
				setIsUploading(false);
			}
		} catch (error) {
			console.error("Avatar upload error: ", error);
			showAlert("Avatar upload failed", "error");
		} finally {
			setIsUploading(false);
		}
	}

	const EditableField = ({ field, label }) => {
		const inputRef = useRef(null);
		const { isDark } = useTheme();

		useEffect(() => {
			if (editStates[field] && inputRef.current) {
				inputRef.current.focus();
			}
		}, [editStates[field]])

		return (
			<div className="relative group bg-opacity-50 p-4 rounded-lg transition-all duration-300 hover:bg-opacity-100">
				<h2 className="text-lg font-semibold mb-1 flex justify-between items-center">
					<p className="mt-3">{label}</p>
					{!editStates[field] && (
						<CiEdit
							className="ml-2 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300"
							onClick={() => handleEdit(field)}
						/>
					)}
				</h2>
				{editStates[field] ? (
					<div className="flex items-center space-x-4 mt-2">
						<input
							ref={inputRef}
							type="text"
							value={formData[field]}
							onChange={(e) => setFormData(prev => ({
								...prev,
								[field]: e.target.value
							}))}
							className={`border rounded-lg border-gray-300 px-4 py-2 focus:outline-none focus:ring focus:border-blue-500 w-96 ${isDark ? 'bg-gray-700' : 'bg-white'
								}`}
						/>
						<button
							onClick={() => handleSave(field)}
							className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 font-semibold"
						>
							Save
						</button>
						<button
							onClick={() => handleCancel(field)}
							className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 font-semibold"
						>
							Cancel
						</button>
					</div>
				) : (
					<p className="text-gray-600">
						{user[field] || 'Not provided'}
					</p>
				)}
			</div>
		)
	}
	return (
		<div className={`p-8 shadow-lg rounded-lg w-full ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
			<div className="max-w-7xl mx-auto">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-4xl font-bold">Profile</h1>
					{!isGoogleUser && (
						<button
							onClick={() => setShowChangePassword(true)}
							className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors duration-300 font-semibold"
						>
							Change Password
						</button>
					)}
				</div>

				<div className="border-b-2 mb-8"></div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
					<div className="space-y-6">
						<div className="flex items-center space-x-6 mb-8">
							<div className="relative">
								<img
									src={user.avatar}
									alt="Profile"
									className="w-24 h-24 rounded-full object-cover shadow-lg"
								/>
								<button
									className={`absolute right-0 bottom-0 ${isDark ? 'bg-gray-700' : 'bg-gray-50'
										} rounded-full p-2 cursor-pointer text-lg hover:bg-gray-200 transition-colors duration-300 shadow-md`}
									onClick={handleUploadClick}
									disabled={isUploading}
								>
									<CiCamera className={isDark ? 'text-white' : 'text-black'} />
								</button>
								<input
									id="file-input"
									type="file"
									accept="image/*"
									style={{ display: 'none' }}
									onChange={handleAvatarChange}
								/>
							</div>
							<div>
								<h2 className="text-2xl font-semibold">{user.name}</h2>
								<p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{user.status}</p>
							</div>
						</div>

						<div className="space-y-2">
							<EditableField field="about" label="About" />
							<EditableField field="phoneNumber" label="Phone Number" />
							<EditableField field="email" label="Email" />
							<div className="pt-2 ml-[14px]">
								<h2 className="text-lg font-semibold mb-4">Social</h2>
								<div className="flex space-x-6 text-2xl">
									<div className="transform transition-all duration-300 hover:scale-125 hover:-translate-y-1">
										<FaFacebook
											className="text-blue-600 hover:text-blue-700 cursor-pointer animate-pulse hover:animate-none transition-colors duration-300 "
										/>
									</div>
									<div className="transform transition-all duration-300 hover:scale-125 hover:-translate-y-1">
										<FaInstagram
											className="text-pink-600 hover:text-pink-700 cursor-pointer transition-all duration-300 hover:rotate-12 "
										/>
									</div>
									<div className="transform transition-all duration-300 hover:scale-125 hover:-translate-y-1">
										<CiTwitter
											className="text-blue-400 hover:text-blue-500 cursor-pointer transition-all duration-300 hover:-rotate-12 "
										/>
									</div>
								</div>
							</div>
						</div>

					</div>

					<div className="lg:pl-6">
						<Conversations />
					</div>
				</div>

				{showChangePassword && !isGoogleUser && (
					<ChangePasswordModal onClose={() => setShowChangePassword(false)} />
				)}
			</div>
		</div>
	)
}
const ChangePasswordModal = ({ onClose }) => {
	const { isDark } = useTheme();
	const { user } = useUser();
	const { showAlert } = useContext(AlertContext);
	const [password, setPassword] = useState({
		oldPassword: '',
		newPassword: '',
		confirmPassword: ''
	});

	const handlePasswordChange = async (e) => {
		e.preventDefault();
		if (password.newPassword !== password.confirmPassword) {
			showAlert("Password do not match", "error");
			return;
		}

		try {
			const response = await axios.put('http://localhost:5000/api/users/update-password',
				{
					oldPassword: password.oldPassword,
					newPassword: password.newPassword
				},
				{
					headers: {
						'Authorization': `Bearer ${user.token}`,
						'Content-Type': 'application/json'
					}
				}
			)
			if (response.status === 200) {
				setPassword({
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				});
				showAlert("Password changed successfully", "success");
				onClose();
			}
		} catch (error) {
			console.error("Password change error: ", error);
			showAlert("Password change failed", "error");
		}
	}

	return (
		<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
			<div className={`px-20 py-10 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white '}`}>
				<h2 className='text-2xl font-bold mb-6'>Change Password</h2>
				<form onSubmit={handlePasswordChange}>
					<div className='mb-6'>
						<label htmlFor="oldPassword" className='block text-lg font-semibold'>Old Password</label>
						<input
							type="password"
							id="oldPassword"
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring focus:border-blue-500 mt-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
							value={password.oldPassword}
							onChange={(e) => setPassword(
								prev => ({
									...prev,
									oldPassword: e.target.value
								})
							)}
						/>
					</div>
					<div className='mb-6'>
						<label htmlFor="newPassword" className='block text-lg font-semibold'>New Password</label>
						<input
							type="password"
							id="newPassword"
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring focus:border-blue-500 mt-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
							value={password.newPassword}
							onChange={(e) => setPassword(
								prev => ({
									...prev,
									newPassword: e.target.value
								})
							)}
						/>
					</div>
					<div className='mb-6'>
						<label htmlFor="confirmPassword" className='block text-lg font-semibold'>Confirm Password</label>
						<input
							type="password"
							id="confirmPassword"
							className={`w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring focus:border-blue-500 mt-2 ${isDark ? 'bg-gray-800' : 'bg-white'}`}
							value={password.confirmPassword}
							onChange={(e) => setPassword(
								prev => ({
									...prev,
									confirmPassword: e.target.value
								})
							)}
						/>
					</div>
					<div>
						<button type='submit' className='bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 font-semibold'>Change Password</button>
						<button type='button' className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors duration-300 font-semibold ml-4' onClick={onClose}>Cancel</button>
					</div>
				</form>
			</div>
		</div>
	);
};
export default Profile;