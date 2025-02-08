import { FaDownload, FaTimes } from "react-icons/fa";

const ImagePreviewModal = ({ isOpen, onClose, imageUrl, fileName }) => {
	if (!isOpen) return null;
	const handleDownload = async (e) => {
		e.preventDefault();
		e.stopPropagation();
		try {
			const response = await fetch(imageUrl);
			const blob = await response.blob();


			const blobUrl = window.URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = blobUrl;
			link.download = fileName || 'image';
			document.body.appendChild(link);
			link.click();

			document.body.removeChild(link);
			window.URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error(error);
		}
	}
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div className="relative max-w-full max-h-full w-full h-full">
				<div className="absolute flex space-x-5 top-0 right-0 mr-5 mt-5">
					<button
						onClick={handleDownload}
						className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					>
						<FaDownload className="text-white text-xl" />
					</button>
					<button
						onClick={onClose}
						className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
					>
						<FaTimes className="text-white text-xl" />
					</button>
				</div>
				<img
					src={imageUrl}
					alt={fileName}
					className="max-h-[80vh] max-w-full mx-auto object-cover mt-10 "
				/>
			</div>
		</div>
	)
};

export default ImagePreviewModal;