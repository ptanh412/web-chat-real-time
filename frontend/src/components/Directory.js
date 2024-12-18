import React, { useEffect } from "react";
import { HiOutlineDotsVertical } from "react-icons/hi";
import { useState } from "react";
import { FaImage, FaVideo, FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileArchive, FaFile, FaDownload } from "react-icons/fa";

const Directory = ({ selectedConversation, socket }) => {
  const [files, setFiles] = useState([]);
  const [members, setMembers] = useState([]);
  useEffect(() => {
    if (!socket || !selectedConversation) return;

    socket.emit('get:files', selectedConversation._id);
    socket.on('files:added', (newFile) => {
      console.log('Conversation id Directory:', newFile.conversationId);
      console.log('Selected Conversation id Directory:', selectedConversation._id);
      console.log('New File directory:', newFile);
      if (newFile.conversationId === selectedConversation._id) {
        setFiles(prevFiles => {
          const fileExists = prevFiles.some(file =>
            file.fileUrl === newFile.fileUrl &&
            file.fileName === newFile.fileName
          );

          if (!fileExists) {
            console.log('Adding new file:', newFile);
            return [...prevFiles, newFile];
          }
          return prevFiles;
        });
      }else{
        console.log('File not added:', newFile);
      }
    })

    socket.emit('get:members', selectedConversation._id);
    socket.on('members:list', (membersList) => {
      setMembers(membersList);
    });

    socket.on('files:list', (filesList) => {
      setFiles(filesList);
    });
    return () => {
      socket.off('files:list');
      socket.off('members:list');
      socket.off('files:added');
    }
  }, [socket, selectedConversation]);

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'image': return <FaImage className="text-red-400 bg-red-200 rounded-full p-1 text-2xl" />;
      case 'video': return <FaVideo className="text-green-500" />;
      case 'pdf': return <FaFilePdf className="text-red-500" />;
      case 'document': return <FaFileWord className="text-blue-400" />;
      case 'spreadsheet': return <FaFileExcel className="text-green-600" />;
      case 'presentation': return <FaFilePowerpoint className="text-orange-500" />;
      case 'archive': return <FaFileArchive className="text-gray-500" />;
      default: return <FaFile className="text-green-300 bg-green-100 rounded-full p-1 text-2xl" />;
    }
  };
  const formatFileSize = (sizeInBytes) => {
    // Ensure sizeInBytes is a number
    const size = Number(sizeInBytes);

    if (isNaN(size)) return 'Unknown size';

    // Convert to MB
    if (size >= 1024 * 1024) {
      const sizeInMB = (size / (1024 * 1024)).toFixed(2);
      return `${sizeInMB} MB`;
    }

    // Convert to KB
    if (size >= 1024) {
      const sizeInKB = (size / 1024).toFixed(2);
      return `${sizeInKB} KB`;
    }

    // Return in bytes if less than 1024
    return `${size} bytes`;
  };

  const truncateFileName = (fileName, maxLength = 20) => {
    // Add a check to ensure fileName is a string
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
    <div className="">
      <div className="flex justify-between items-center mt-3 px-5">
        <h1 className="font-bold text-3xl">Directory</h1>
        <HiOutlineDotsVertical className="text-3xl text-blue-500 bg-slate-200 p-1 rounded-full" />
      </div>
      <div className="">
        <div className="mt-2 border-b">
          <div className="p-7">
            <div className="flex items-center space-x-3">
              <h1 className="font-bold text-lg">Members</h1>
              <p className="text-sm text-black bg-slate-200 rounded-full font-bold px-2">{calculateMemberCount(members)}</p>

            </div>
            <ul className="mt-3">
              {members.map((member, index) => (
                <li key={index} className="flex items-center space-x-3 mt-5">
                  <img
                    className="w-8 h-8 bg-gray-200 rounded-full"
                    src={member.avatar}
                  />
                  <div>
                    <h1 className="font-semibold">{member.name}</h1>
                    <p className="text-sm text-gray-400">{member.role}</p>
                  </div>
                </li>
              ))}
            </ul>

          </div>
        </div>
        <div className="">
          <div className="flex items-center space-x-3 px-7 py-2">
            <h1 className="font-bold text-lg">Files</h1>
            <p className="text-sm text-black bg-slate-200 rounded-full font-bold px-2">{calculateFileCount(files)}</p>
          </div>
          <div className="mt-1">
            {files.length === 0 ? (
              <div className="text-center text-gray-500 py-10">
                No files in this conversation
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[170px]">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center px-7 py-2 cursor-pointer"
                  >
                    <div className="mr-4">{getFileIcon(file?.fileType)}</div>
                    <div className="flex-1">
                      {/* Truncate file name */}
                      <p className="font-medium truncate max-w-[200px]">
                        {truncateFileName(file?.fileName)}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center space-x-2">
                        <span>Sent by {file.sender?.name || 'Unknown'}</span>
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                          {formatFileSize(file?.fileSize)}
                        </span>
                      </p>
                    </div>
                    <a
                      href={file?.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <FaDownload />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Directory;
