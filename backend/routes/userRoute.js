// ...routes/userRoute.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middlewares/auth');
router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile',authenticate, userController.getUserProfile);
router.put('/update-profile',authenticate, userController.updateProfile);
router.put('/update-password',authenticate, userController.updatePassword);
router.put('/update-status',authenticate, userController.updateStatus);
router.post('/forgot-password', userController.forgotPassword);
router.post('/reset-password', userController.resetPassword);
router.post('/logout',authenticate, userController.logout);
module.exports = router;