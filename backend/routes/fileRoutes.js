const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const verifyToken = async (req, res, next) => {
	try {
		const {token} = req.params;

		if (!token) {
			return res.status(400).json({error: 'Invalid token'});
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
		req.fileAccess = decoded;
		next();
	} catch (error) {
		return res.status(401).json({error: 'Invalid token'});
	}
}

router.get('/download/:token', verifyToken, async (req, res) => {
	try {
		const {fileUrl} = req.fileAccess;
		const response = await axios({
			method: 'GET',
			url: fileUrl,
			responseType: 'stream'
		})

		res.setHeader('Content-Type', response.headers['content-type']);
		res.setHeader('Content-Disposition', 'inline');

		response.data.pipe(res);	
	} catch (error) {
		console.error('Error downloading file:', error);
		res.status(500).json({error: 'Error downloading file'});
	}
});

module.exports = router;