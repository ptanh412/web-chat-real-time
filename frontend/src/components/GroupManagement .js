import { useUser } from "../context/UserContext"
import { useState, useEffect, useRef, useContext, useCallback, useMemo } from "react";
import { HiPhotograph, HiPencil, HiOutlineDotsVertical, HiPlus } from "react-icons/hi";
import { HiUserAdd, HiUserRemove, HiLogout } from "react-icons/hi";
import axios from "axios";
import { AlertContext } from "../context/AlertMessage";
import { useTheme } from "../context/ThemeContext";

const GroupManagement = ({ selectedConversation, socket, onClose, setSelectedConversation }) => {
	const { isDark } = useTheme();
	const { user } = useUser();
	const [showMenu, setShowMenu] = useState(false);
	const [isEditing, setIsEditing] = useState(false);
	const [groupName, setGroupName] = useState(selectedConversation?.name || '');
	const fileInputRef = useRef(null);
	const { showAlert } = useContext(AlertContext);
	const [showFriendList, setShowFriendList] = useState(false);
	const [friends, setFriends] = useState([]);

	useEffect(() => {
		setGroupName(selectedConversation?.name || '');
	}, [selectedConversation]);

	const existingParticipantIds = useMemo(() =>
		selectedConversation?.participants?.map(p => p._id.toString()) || [],
		[selectedConversation?.participants]
	)
	const getFriendList = useCallback(async () => {
		if (!user?.token) return;
		try {
			const response = await axios.get(`http://localhost:5000/api/friends/friendList`, {
				headers: {
					Authorization: `Bearer ${user.token}`,
				}
			});

			const filteredFriends = response.data.data.filter(friend =>
				!existingParticipantIds.includes(friend._id.toString())
			);

			setFriends(filteredFriends);
			console.log("Friends list: ", filteredFriends);
		} catch (error) {
			console.log("Get friends failed: ", error);
			showAlert("Failed to fetch friends list", "error");
		}
	}, [user?.token, existingParticipantIds, showAlert]);

	useEffect(() => {
		if (showFriendList) {
			getFriendList();
		}
	}, [getFriendList, showFriendList]);


	useEffect(() => {
		if (!socket) return;

		const handleGroupUpdate = (updatedGroup) => {
			if (updatedGroup._id === selectedConversation?._id) {
				setSelectedConversation(prev => ({
					...prev,
					...updatedGroup
				}));
				setGroupName(updatedGroup.name || '');
			}
		};

		socket.on('group:updated', handleGroupUpdate);
		socket.on('conversation:updated', handleGroupUpdate);

		return () => {
			socket.off('group:updated', handleGroupUpdate);
			socket.off('conversation:updated', handleGroupUpdate);
		};
	}, [socket, selectedConversation?._id]);

	const handleUpdateGroup = (newData) => {
		if (!socket || !selectedConversation) return;

		setSelectedConversation(prev => ({
			...prev,
			...newData,
		}))

		socket.emit('group:updated', {
			groupId: selectedConversation._id,
			name: newData.name || selectedConversation.name,
			avatarGroup: newData.avatarGroup || selectedConversation.avatarGroup,
			participants: selectedConversation.participants,
			type: 'group',
			updatedAt: new Date()
		});
	};

	const handleNameChange = (e) => {
		e.preventDefault();
		if (groupName.trim()) {
			setSelectedConversation(prev => ({
				...prev,
				name: groupName
			}));

			handleUpdateGroup({ name: groupName });
			setIsEditing(false);
		}
	}

	const handleAvatarChange = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		if (file.size > 10 * 1024 * 1024) {
			showAlert("File size should be less than 5MB", "error");
			return;
		}

		const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
		if (!validTypes.includes(file.type)) {
			showAlert("Please select a valid image file (JPEG, PNG, GIF)", "error");
			return;
		}


		const formData = new FormData();
		formData.append('file', file);
		formData.append('groupId', selectedConversation._id);

		try {
			const tempUrl = URL.createObjectURL(file);

			setSelectedConversation(prev => ({
				...prev,
				avatarGroup: tempUrl
			}));
			const response = await axios.post('http://localhost:5000/api/upload/upload-group-avatar', formData, {
				headers: {
					'Content-Type': 'multipart/form-data',
					'Authorization': `Bearer ${user.token}`
				}
			})
			if (response.status === 200) {
				const avatarUrl = response.data.fileUrl;
				handleUpdateGroup({ avatarGroup: avatarUrl });
				// showAlert("Avatar uploaded successfully", "success");
			}
		} catch (error) {
			console.error("Avatar upload error: ", error);
			showAlert("Avatar upload failed", "error");
			setSelectedConversation(prev => ({
				...prev,
				avatarGroup: selectedConversation.avatarGroup
			}))
		}
	}
	const handlShowAddMember = () => {
		setShowFriendList(true);
		setShowMenu(false);
	}
	const handleAddmember = (friendId) => {
		if (!socket || !selectedConversation) return;

		socket.emit('group:addMembers', {
			groupId: selectedConversation._id,
			memberId: friendId
		})
		setShowFriendList(false);
	}

	const handleLeaveGroup = () => {
		if (!socket || !selectedConversation) return;
		socket.emit('group:leave', {
			groupId: selectedConversation._id,
			userId: user._id
		});
		onClose();
	}
	return (
		<div className="relative">
			<div className="flex items-center space-x-4 p-4">
				<div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
					<img
						src={selectedConversation?.avatarGroup || ''}
						alt="Group Avatar"
						className="w-12 h-12 rounded-full"
					/>
					<div className="absolute inset-0 bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center">
						<HiPhotograph className="text-white text-xl" />
					</div>
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						accept="image/*"
						onChange={handleAvatarChange}
					/>
				</div>

				{isEditing ? (
					<form onSubmit={handleNameChange} className="flex-1">
						<input
							type="text"
							value={groupName}
							onChange={(e) => setGroupName(e.target.value)}
							className={`w-full px-2 py-1 border rounded ${isDark ? 'bg-gray-500 text-white' : 'bg-gray-100'}`}
							autoFocus
						/>
					</form>
				) : (
					<h2 className="font-semibold text-lg flex-1">
						{selectedConversation?.name}
						<button onClick={() => setIsEditing(true)} className="ml-2">
							<HiPencil className="inline text-gray-500 hover:text-gray-700" />
						</button>
					</h2>
				)}

				<button onClick={() => setShowMenu(!showMenu)}>
					<HiOutlineDotsVertical className="text-2xl text-gray-500" />
				</button>
			</div>

			{showMenu && (
				<div className={`absolute right-4 top-16 shadow-lg rounded-lg py-2 z-10 ${isDark ? 'bg-gray-500' : 'bg-white'}`}>
					<button
						onClick={handlShowAddMember}
						className={`w-full h-full px-4 py-2 text-left flex items-center space-x-2 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
					>
						<HiUserAdd className="text-green-500" />
						<span>Add Member</span>
					</button>

					<button
						onClick={handleLeaveGroup}
						className={`w-full px-4 py-2 text-left  flex items-center space-x-2 ${isDark ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
					>
						<HiLogout className="text-red-500" />
						<span>Leave Group</span>
					</button>
				</div>
			)}
			{showFriendList && (
				<div className={`absolute right-4 top-16 shadow-lg rounded-lg  z-10 w-64 ${isDark ? 'bg-gray-500' : 'bg-white'}`}>
					<div className="px-4 py-2 font-semibold text-xl">Add Members</div>
					{friends.length === 0 ? (
						<div className="px-4 py-2 text-gray-500">No friends available to add</div>
					) : (
						friends.map(friend => (
							<div
								key={friend._id}
								className={`px-4 py-2  flex items-center justify-between cursor-pointer ${isDark ? 'text-white bg-gray-500 hover:bg-gray-600' : 'text-gray-800 hover:bg-gray-100'}`}
							>
								<div className="flex items-center space-x-2">
									<img
										src={friend.avatar}
										alt={friend.name}
										className="w-8 h-8 rounded-full"
									/>
									<span>{friend.name}</span>
								</div>
								<button
									onClick={() => handleAddmember(friend._id)}
									className="text-blue-500 hover:text-blue-700"
								>
									<HiPlus className="text-xl" />
								</button>
							</div>
						))
					)}
					<button
						onClick={() => setShowFriendList(false)}
						className={`w-full px-4 py-2 font-semibold text-center hover:rounded-b-lg text-gray-500 border-t ${isDark ? 'border-gray-600 text-white hover:bg-gray-700 ' : 'border-gray-200 hover:bg-gray-100 '}`}
					>
						Close
					</button>
				</div>
			)}

		</div>
	);
};
export default GroupManagement;