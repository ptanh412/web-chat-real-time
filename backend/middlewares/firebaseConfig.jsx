// const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

// const { initializeApp } = require('firebase/app');
// const multer = require('multer');

// const firebaseConfig = {
// 	apiKey: process.env.FIREBASE_API_KEY,
// 	authDomain: process.env.FIREBASE_AUTH_DOMAIN,
// 	projectId: process.env.FIREBASE_PROJECT_ID,
// 	storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
// 	messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
// 	appId: process.env.FIREBASE_APP_ID,
// };

// const app = initializeApp(firebaseConfig);
// const storage = getStorage(app);

// const upload = multer({
// 	storage: multer.memoryStorage(),
// 	limits: {
// 		fileSize: 20 * 1024 * 1024,
// 	},
// 	fileFilter: (req, file, cb) => {
// 		const allowedTypes = [
// 			'image/jpeg',
// 			'image/jpg',
// 			'image/png',
// 			'video/mp4',
// 			'video/mov',
// 			'video/avi',
// 			'audio/mpeg',
// 			'audio/wav',
// 			'audio/ogg',
// 			'application/pdf',
// 			'application/msword',
// 			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
// 			'application/vnd.ms-powerpoint',
// 			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
// 			'application/vnd.ms-excel',
// 			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
// 		];
// 		if (allowedTypes.includes(file.mimetype)) {
// 			cb(null, true);
// 		} else {
// 			cb(new Error('Invalid file to support'));
// 		}
// 	}
// });

// const uploadtoFirebase = async (file) => {
// 	try {
// 		const fileName = `${Date.now()}_${file.originalname}`;
// 		const storageRef = ref(storage, `uploads/${fileName}`);

// 		const snapshot = await uploadBytes(storageRef, file.buffer);
// 		const downloadURL = await getDownloadURL(snapshot.ref);

// 		return {
// 			fileName,
// 			fileUrl: downloadURL,
// 		};
// 	} catch (error) {
// 		console.error('Uploat to Firebase failed: ', error);
// 		throw error;
// 	}
// }
// const getFileType = (mimeType) => {
// 	if (mimeType.includes('image')) {
// 		return 'image';
// 	}
// 	if (mimeType.includes('video')) {
// 		return 'video';
// 	}
// 	if (mimeType.includes('audio')) {
// 		return 'audio';
// 	}
// 	if (mimeType.includes('pdf')) {
// 		return 'pdf';
// 	}
// 	if (mimeType.includes('wordprocessingml.document')) {
// 		return 'doc';
// 	}
// 	if (mimeType.includes('presentationml.presentation')) {
// 		return 'ppt';
// 	}
// 	if (mimeType.includes('spreadsheetml.sheet')) {
// 		return 'xls';
// 	}
// 	return 'other';
// };
// app.post('/upload', upload.single('files', 10), async (req, res) => {
// 	try {
// 		if (!req.file || req.file.length === 0) {
// 			return res.status(400).send('No file uploaded');
// 		}

// 		const uploadPromise = req.files.map(file => uploadtoFirebase(file));
// 		const uploadResult = await uploadtoFirebase(uploadPromise);

// 		res.json({
// 			files: uploadResult.map(result => ({
// 				fileUrl: result.fileUrl,
// 				fileName: result.fileName,
// 				fileType: getFileType(req.files.find(file => file.originalname === result.fileName).mimetype),
// 			}))
// 		})
// 	} catch (error) {
// 		res.status(500).send('Upload failed');
// 	}
// });

// module.exports = app;