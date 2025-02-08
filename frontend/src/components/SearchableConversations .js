import { useEffect, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
const SearchableConversations = ({
	conversations,
	setSelectedConversation,
	isDark,
}) => {
	const [showDropdown, setShowDropdown] = useState(false);
	const [searchValue, setSearchValue] = useState('');
	const dropdownRef = useRef(null);

	useEffect(() => {
		const handleClickOutside = (event) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
				setShowDropdown(false);
			}
		}
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		}
	}, []);

	const handleConversationClick = (conversation) => {
		setSelectedConversation(conversation);
		setShowDropdown(false);
		setSearchValue('');
	}

	const filteredConversations = searchValue ? conversations.filter((conv) => {
		const name = conv.type === 'group'
			? (conv.name || '')
			: (conv.otherParticipant?.name || '');
		return name.toLowerCase().includes(searchValue.toLowerCase());
	}) : conversations;
	return (
		<div className="relative w-full" ref={dropdownRef}>
			<div className="flex">
				<button
					className={`rounded-l-lg px-3 hover:bg-gray-200 duration-150 text-gray-400 ${isDark ? "bg-gray-700" : "bg-gray-100"
						}`}
				>
					<FaSearch />
				</button>
				<input
					type="text"
					className={`w-full py-1 px-3 rounded-r-lg outline-none ${isDark ? "bg-gray-700" : "bg-gray-100"
						}`}
					placeholder="Search conversations..."
					value={searchValue}
					onChange={(e) => setSearchValue(e.target.value)}
					onFocus={() => setShowDropdown(true)}
				/>
			</div>

			{showDropdown && (
				<div
					className={`absolute w-full mt-1 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto ${isDark ? "bg-gray-700" : "bg-white"
						}`}
				>
					{filteredConversations.length > 0 ? (
						filteredConversations.map((conversation) => (
							<div
								key={conversation._id}
								className={`flex items-center p-2 cursor-pointer ${isDark ? "hover:bg-gray-600" : "hover:bg-gray-100"
									}`}
								onClick={() => handleConversationClick(conversation)}
							>
								<img
									src={
										conversation.type === 'group'
											? conversation.avatarGroup
											: conversation.otherParticipant?.avatar
									}
									alt="avatar"
									className="w-8 h-8 rounded-full mr-3"
								/>
								<span className={`${isDark ? "text-white" : "text-gray-800"}`}>
									{conversation.type === 'group'
										? conversation.name
										: conversation.otherParticipant?.name
									}
								</span>
							</div>
						))
					) : (
						<div className={`p-2 text-center ${isDark ? "text-gray-300" : "text-gray-500"}`}>
							No conversations found
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default SearchableConversations;

