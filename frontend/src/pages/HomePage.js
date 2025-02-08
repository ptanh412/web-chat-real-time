import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const HomePage = () => {
	const { isDark } = useTheme();
	const navigate = useNavigate();
	return (
		<div className={`flex flex-col items-center justify-center h-full text-gray-500 space-y-4 ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
			<svg
				className="w-24 h-24 text-gray-300"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8zM7 6V4a2 2 0 012-2h8a2 2 0 012 2v2M3 10v6a2 2 0 002 2h2v4l4-4h3"
				/>
			</svg>
			<p className="text-xl">Start a new conversation</p>
			<button
				className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
				onClick={() => navigate('/chat')}
			>
				Start a Conversation
			</button>
		</div>
	);
};

export default HomePage;