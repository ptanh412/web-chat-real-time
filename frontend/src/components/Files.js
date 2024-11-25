import React from "react";
import { MdDownloadForOffline } from "react-icons/md";
const Files = () => {
  const files = [
    { name: "Document1.pdf", type: "PDF" },
    { name: "Image1.png", type: "Image" },
    { name: "Presentation.pptx", type: "PowerPoint" },
  ];

  return (
    <div className="">
      <h3>Files</h3>
      {/* <ul>
        {files.map((file, index) => (
          <li key={index}>{file.name} - {file.type}</li>
        ))}
      </ul> */}
    </div>
  );
};

export default Files;
