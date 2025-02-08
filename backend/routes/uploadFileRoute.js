const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const auth = require('../middlewares/auth');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});


const generateSecureFileName = (originalname) => {
    const baseName = path.basename(originalname);

    const randomPrefix = crypto.randomBytes(16).toString('hex');

    const sanitized = baseName.replace(/[^a-zA-Z0-9.]/g, '_');

    return `${randomPrefix}_${sanitized}`;
}

const isValidFileType = (mimeType, filename) => {
    const allowedTypes = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/vnd.ms-excel': ['.xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    };

    const ext = path.extname(filename).toLowerCase();
    return allowedTypes[mimeType]?.includes(ext);
}

const getResourceType = (mimeType) => {
    const mimeTypeLower = mimeType.toLowerCase();

    const mimeTypeMap = {
        'image': {
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

    for (const [fileType, config] of Object.entries(mimeTypeMap)) {
        if (config.matches.some(match => mimeTypeLower.includes(match))) {
            return {
                fileType: fileType,
                cloudinaryType: config.cloudinaryType
            };
        }
    }
    return {
        fileType: 'other',
        cloudinaryType: 'raw'
    };
}

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        try {
            const userId = req.user ? req.user._id : 'guest';
            // const { fileType, cloudinaryType } = getResourceType(file.mimetype);

            const secureFileName = generateSecureFileName(file.originalname);

            // const originalFileName = file.originalname;

            const params = {
                folder: `Chat/${userId}`,
                resource_type: 'auto',
                public_id: secureFileName,
                transformation: [
                    { quality: 'auto' },
                    { fetch_format: 'auto' },
                ],
                sign_url: true,
                type: 'authenticated',
                // filename: originalFileName
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
    
        if (isValidFileType(file.mimetype, file.originalname)) {
            console.log('File type allowed:', file.mimetype);
            cb(null, true);
        } else {
            console.log('File type not allowed:', file.mimetype);
            cb(new Error('Invalid file type'), false);
        }
    }
});

router.post('/multiple', auth, uploadCloud.array('files', 10), async (req, res) => {
    try {
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadResults = await Promise.all(req.files.map(async (file) => {
            try {
                if (!file.path) {
                    console.error('No Cloudinary URL found for file:', file.originalname);
                    return null;
                }
                const { fileType } = getResourceType(file.mimetype);

                const fileToken = jwt.sign({
                    fileUrl: file.path,
                    fileId: file.filename,
                    userId: req.user.id
                },
                    process.env.JWT_SECRET_KEY,
                    {
                        expiresIn: '10m'
                    }
                );

                const secureDownloadUrl = `http://localhost:5000/api/files/download/${fileToken}`;
                return {
                    fileName: file.originalname,
                    fileUrl: secureDownloadUrl,
                    fileType: fileType,
                    fileSize: file.size,
                    mimetype: file.mimetype,
                    // accessToken: fileToken
                };
            } catch (fileError) {
                console.error(`Error processing file ${file.originalname}:`, fileError);
                return null;
            }
        }));
    
        res.json({files: uploadResults});
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({
            error: 'Upload failed',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.post('/upload-avatar', uploadCloud.single('file'), async (req, res) => {
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
        res.status(500).json({ error: 'Failed to upload file' });
    }
})

// In your upload endpoint
router.post('/upload-group-avatar', uploadCloud.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ error: 'Invalid file type' });
        }

        // Validate file size (10MB)
        if (req.file.size > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File size too large' });
        }

        // Configure cloudinary upload
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'Chat',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
            transformation: [
                { width: 500, height: 500, crop: 'fill' },
                { quality: 'auto' }
            ]
        });

        res.status(200).json({
            fileUrl: result.secure_url,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

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