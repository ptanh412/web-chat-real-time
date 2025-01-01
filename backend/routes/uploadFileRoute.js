const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});
const getAllowedFormats = (mimeType) => {
    const mimeTypeLower = mimeType.toLowerCase();

    const formatMap = {
        'image': ['jpeg', 'png', 'gif', 'jpg'],
        'video': ['mp4'],
        'pdf': ['pdf'],
        'word': ['doc', 'docx'],
        'excel': ['xls', 'xlsx'],
        'powerpoint': ['ppt', 'pptx'],
        'zip': ['zip']
    };

    const resourceType = getResourceType(mimeTypeLower);
    return formatMap[resourceType] || [];
};


const getResourceType = (mimeType) => {
    const mimeTypeLower = mimeType.toLowerCase();

    const mimeTypeMap = {
        'image':{
            matches: ['image/'],
            cloudinaryType: 'image'
        },
        'video': {
            matches: ['video/'],
            cloudinaryType: 'video'
        },
        'pdf': {
            matches: ['application/pdf'],
            cloudinaryType: 'raw'
        },
        'document': {
            matches: [
                'application/msword', 
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            cloudinaryType: 'raw'
        },
        'spreadsheet': {
            matches: [
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
            cloudinaryType: 'raw'
        },
        'presentation': {
            matches: [
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
            cloudinaryType: 'raw'
        },	
        'archive': {
            matches: [
                'application/zip',
                'application/x-rar-compressed',
            ],
            cloudinaryType: 'raw'
        }
    };
    
    for (const [fileType, config] of Object.entries(mimeTypeMap)){
        if (config.matches.some(match => mimeTypeLower.includes(match))) {
            return {
                fileType: fileType,
                cloudinaryType: config.cloudinaryType
            };
        }
    }
    return{
        fileType: 'other',
        cloudinaryType: 'raw'
    };
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        try {
            // const fileFormat = getAllowedFormats(file.mimetype);
            const {fileType, cloudinaryType} = getResourceType(file.mimetype);

            // if (!fileFormat) {
            //     throw new Error(`File type ${file.mimetype} not supported`);
            // }

            const originalFileName = file.originalname;

            const params = {
                folder: 'Chat',
                resource_type: cloudinaryType,
                public_id: `${Date.now()}_${originalFileName}`,
                filename: originalFileName,
            };
            
            return params;
        } catch (err) {
            console.error('Error in Cloudinary Params:', err);
            throw err;
        }
    }
});

const uploadCloud = multer({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'video/mp4',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/zip',
        ];

        if (allowedTypes.includes(file.mimetype)) {
            console.log('File type allowed:', file.mimetype);
            cb(null, true);
        } else {
            console.log('File type not allowed:', file.mimetype);
            cb(new Error('Invalid file type'), false);
        }
    }
});

router.post('/multiple', uploadCloud.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }
        // console.log('Uploaded Files Details:', req.files.map(file => ({
        //     originalname: file.originalname,
        //     mimetype: file.mimetype,
        //     encoding: file.encoding
        // })));

        const uploadResults = await Promise.all(req.files.map(async (file) => {
            try {
                if (!file.path) {
                    console.error('No Cloudinary URL found for file:', file.originalname);
                    return null;
                }
                const {fileType} = getResourceType(file.mimetype);
                return {
                    fileName: file.originalname, 
                    fileUrl: file.path,
                    fileType: fileType,
                    fileSize: file.size,
                    mimetype: file.mimetype,
                    originalName: file.originalname 
                };
            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                return null;
            }
        }));

        const validUploadResults = uploadResults.filter(result => result !== null);

        if (validUploadResults.length === 0) {
            return res.status(500).json({ error: 'Failed to upload any files' });
        }

        res.json({
            files: validUploadResults
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            error: 'Upload failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.post('/upload-avatar', uploadCloud.single('file'), async (req, res) =>{
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        res.status(200).json({
            fileUrl: req.file.path,
            message: 'File uploaded successfully'
        })
            
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({error: 'Failed to upload file'});
    }
})
router.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        error: 'Upload processing error',
        message: err.message,
        details: err.toString(),
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

module.exports = router;