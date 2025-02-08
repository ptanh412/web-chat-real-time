import React, { useEffect } from "react";
import { HiOutlineDotsVertical, HiUserRemove } from "react-icons/hi";
import { useState } from "react";
import { FaImage, FaVideo, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFile, FaDownload } from "react-icons/fa";
import { useTheme } from "../context/ThemeContext";
import GroupManagement from "./GroupManagement ";
import { useUser } from "../context/UserContext";
import ImagePreviewModal from "./ImgaePreviewModal";

const Directory = ({ selectedConversation, socket, setSelectedConversation }) => {
  const { user } = useUser();
  const { isDark } = useTheme();
  const [files, setFiles] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);

  const isCreator = selectedConversation?.creator === user._id;

  const isImageFile = (fileType) => {
    return fileType === 'image';
  };

  const handleFileClick = (file) => {
    if (isImageFile(file.fileType)) {
      setSelectedImage({
        url: file.fileUrl,
        fileName: file.fileName
      });
    }
  }

  const handleDownloadFile = async (file, e) =>{
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(file.fileUrl);
      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    }
  }
  useEffect(() => {
    if (selectedConversation?.participants) {
      setMembers(selectedConversation.participants);
    }
  }, [selectedConversation]);


  useEffect(() => {
    if (!socket || !selectedConversation) return;

    const handleMemberRemove = (updatedGroup) => {
      if (updatedGroup._id === selectedConversation._id) {
        setMembers(updatedGroup.participants);
        setSelectedConversation(updatedGroup);
      }
    };

    socket.on('group:updated', handleMemberRemove);

    return () => {
      socket.off('group:updated', handleMemberRemove);
    }
  }, [socket, selectedConversation, setSelectedConversation]);


  const handleRemoveMember = (memberId) => {
    if (!socket || !selectedConversation || memberId === selectedConversation.creator) return;

    const updatedMembers = members.filter(member => member._id !== memberId);
    setMembers(updatedMembers);

    setSelectedConversation(prev => ({
      ...prev,
      participants: prev.participants.filter(member => member._id !== memberId)
    }))

    socket.emit('group:removeMember', {
      groupId: selectedConversation._id,
      memberId: memberId
    });
  };
 
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    socket.emit('get:files', selectedConversation._id);

    const handleNewFile = (newFile) => {
      if (newFile.conversationId === selectedConversation._id) {

        setFiles(prevFiles => {
          const fileExists = prevFiles.some(file =>
            file.fileUrl === newFile.fileUrl &&
            file.fileName === newFile.fileName
          );

          if (!fileExists) {
            const formattedFile = {
              fileName: newFile.fileName,
              fileType: newFile.fileType || getFileTypeFromName(newFile.fileName),
              fileSize: newFile.fileSize,
              fileUrl: newFile.fileUrl,
              sender: newFile.sender,
              conversationId: newFile.conversationId,
              createdAt: newFile.createdAt || new Date().toISOString()
            }
            return [formattedFile, ...prevFiles];
          }
          return prevFiles;
        });
      }
    }
    socket.on('files:list', (filesList) => {
      setFiles(filesList);
    });

    socket.on('files:added', handleNewFile);


    if (selectedConversation.type === 'group') {
      socket.emit('get:members', selectedConversation._id);
      socket.on('members:list', (membersList) => {
        setMembers(membersList);
      });
    }


    return () => {
      socket.off('files:list');
      socket.off('members:list');
      socket.off('files:added');
    }
  }, [socket, selectedConversation]);

  const getFileTypeFromName = (fileName) => {
    if (!fileName) return 'file';
    const extension = fileName.split('.').pop().toLowerCase();

    const typeMap = {
      'pdf': 'pdf',
      'doc': 'document',
      'docx': 'document',
      'xls': 'spreadsheet',
      'xlsx': 'spreadsheet',
      'ppt': 'presentation',
      'pptx': 'presentation',
      'zip': 'archive',
      'rar': 'archive',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'mp4': 'video',
      'avi': 'video',
      'mov': 'video'
    };

    return typeMap[extension] || 'file';
  };
  const getFileIcon = (fileType) => {
    const iconMap = {
      'image': <div className="bg-blue-500 text-white p-1 rounded-lg"><FaImage className="text-sm" /></div>,
      'video': <div className="bg-green-500 text-white p-1 rounded-lg"><FaVideo className="text-sm" /></div>,
      'pdf': <div className="bg-red-500 text-white p-1 rounded-lg"><FaFilePdf className="text-sm" /></div>,
      'document': <div className="bg-blue-400 text-white p-1 rounded-lg"><FaFileWord className="text-sm" /></div>,
      'spreadsheet': <div className="bg-green-600 text-white p-1 rounded-lg"><FaFileExcel className="text-sm" /></div>,
      'presentation': <div className="bg-orange-500 text-white p-1 rounded-lg"><FaFilePowerpoint className="text-sm" /></div>,
      'archive': <div className="bg-gray-500 text-white p-1 rounded-lg"><FaFileArchive className="text-sm" /></div>,
      'other': <div className="bg-gray-400 text-white p-1 rounded-lg"><FaFile className="text-sm" /></div>
    };
    return iconMap[fileType] || iconMap.other;
  };

  const formatFileSize = (sizeInBytes) => {
    const size = Number(sizeInBytes);

    if (isNaN(size)) return 'Unknown size';

    if (size >= 1024 * 1024) {
      const sizeInMB = (size / (1024 * 1024)).toFixed(2);
      return `${sizeInMB} MB`;
    }

    if (size >= 1024) {
      const sizeInKB = (size / 1024).toFixed(2);
      return `${sizeInKB} KB`;
    }

    return `${size} bytes`;
  };

  const truncateFileName = (fileName, maxLength = 20) => {
    if (!fileName || typeof fileName !== 'string') {
      return 'Unknown File';
    }

    if (fileName.length <= maxLength) return fileName;
    return fileName.substring(0, maxLength) + '...';
  };
  const calculateFileCount = (files) => {
    return Array.isArray(files) ? files.length : 0;
  };

  const calculateMemberCount = (members) => {
    return Array.isArray(members) ? members.length : 0;
  }

  return (
    <div className={`${isDark ? 'bg-slate-800 text-white' : 'bg-white'} h-full flex flex-col rounded-lg`}>
      {selectedConversation?.type === 'group' ? (
        <GroupManagement
          selectedConversation={selectedConversation}
          socket={socket}
          setSelectedConversation={setSelectedConversation}
          onClose={() => setSelectedConversation(null)}
        />
      ) : (
        <div className="flex justify-between items-center mt-3 px-5">
          <h1 className="font-bold text-3xl">Directory</h1>
          <HiOutlineDotsVertical className={`text-3xl text-blue-500  p-1 rounded-full ${isDark ? '' : 'bg-slate-200'} `} />
        </div>

      )}

      <div className="flex-1 overflow-y-auto">
        {selectedConversation?.type === 'group' && (
          <div className="mt-2 border-b">
            <div className="p-7">
              <div className="flex items-center space-x-3">
                <h1 className="font-bold text-lg">Members</h1>
                <p className="text-sm text-black bg-slate-200 rounded-full font-bold px-2">{calculateMemberCount(members)}</p>
              </div>
              <ul className="mt-3">
                {members.map((member, index) => (
                  <li key={index} className="flex items-center space-x-3 mt-5 justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        className="w-8 h-8 bg-gray-200 rounded-full"
                        src={member.avatar}
                      />
                      <div>
                        <h1 className="font-semibold">{member.name}</h1>
                        {selectedConversation.creator === member._id ? (
                          <p className="text-sm text-gray-400">Creator</p>
                        ) : (
                          <p className="text-sm text-gray-400">Member</p>
                        )}
                        {/* <p className="text-sm text-gray-400">{member.role}</p> */}
                      </div>
                    </div>
                    {isCreator && member._id !== user._id && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <HiUserRemove className="text-xl" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>

            </div>
          </div>
        )}

        <div className="">
          <div className="flex items-center space-x-3 px-7 py-2">
            <h1 className="font-bold text-lg">Files</h1>
            <p className={`text-sm text-black ${isDark ? 'bg-gray-500 text-white' : 'bg-gray-200'} rounded-full font-bold px-2`}>{calculateFileCount(files)}</p>
          </div>
          <div className="mt-1">
            {files.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No files in this conversation
              </div>
            ) : (
              <div className="overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center px-7 py-2 cursor-pointer"
                    onClick={() => handleFileClick(file)}
                  >
                    <div className="mr-4">{getFileIcon(file?.fileType)}</div>
                    <div className="flex-1">
                      <p className="font-medium truncate max-w-[200px]">
                        {truncateFileName(file?.fileName)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center space-x-2">
                        <span>Sent by {file.sender?.name || 'Unknown'}</span>
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded font-semibold">
                          {formatFileSize(file?.fileSize)}
                        </span>
                      </p>
                    </div>
                    {!isImageFile(file.fileType) && (
                      <button
                        onClick={(e) => handleDownloadFile(file, e)}
                      >
                        <FaDownload className="text-blue-500"/>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <ImagePreviewModal
            isOpen={!!selectedImage}
            onClose={() => setSelectedImage(null)}
            imageUrl={selectedImage?.url}
            fileName={selectedImage?.fileName}
          />
        </div>
      </div>
    </div>
  );
};

export default Directory;
