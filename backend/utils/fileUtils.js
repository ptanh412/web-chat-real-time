// utils/fileUtils.js

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
        'audio':{
            matches: ['audio/'],
            cloudinaryType: 'audio'
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
    try {
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
        
    } catch (error) {
        console.error('Error getting resource type:', error);
        return {
            fileType: 'other',
            cloudinaryType: 'raw'
        };
    }
}

module.exports = {
    getResourceType
};