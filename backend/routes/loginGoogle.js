const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const express = require('express');
const session = require('express-session');
const router = express.Router();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const Users = require('../models/Users');
dotenv.config();


router.use(session({
	secret: process.env.JWT_SECRET_KEY,
	resave: false,
	saveUninitialized: true,
}))

router.use(passport.initialize());
router.use(passport.session());

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((user, done) => {
	done(null, user);
})

passport.use(new GoogleStrategy({
	clientID: process.env.GOOGLE_CLIENT_ID,
	clientSecret: process.env.GOOGLE_CLIENT_SECRET,
	callbackURL: 'http://localhost:3000/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
	try {
		const user = {
			id: profile.id,
			name: profile.displayName,
			email: profile.emails[0].value,
			avatar: profile.photos[0].value
		}
		return done(null, user);
	} catch (error) {
		return done(error, null);
	}
}))
router.post('/google', async (req, res) => {
	try {
		const {OAuth2Client} = require('google-auth-library');
		const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

		const ticket = await client.verifyIdToken({
			idToken: req.body.token,
			audience: process.env.GOOGLE_CLIENT_ID
		})

		const payload = ticket.getPayload();

		let user = await Users.findOne({email: payload.email});

		if (!user) {
			user =  new Users({
				name: payload.name,
				email: payload.email,
				avatar: payload.picture,
				googleId: payload.sub
			})
			await user.save();
		}

		const token = jwt.sign({
			id: user._id,
			name: user.name,
			email: user.email,
			avatar: user.avatar
		}, process.env.JWT_SECRET_KEY, {expiresIn: '1h'});
		res.status(200).json({
			success: true,
			data:{
				token,
				name: user.name,
				email: user.email,
				avatar: user.avatar,
				status: 'online',
				_id: user._id,
				lastActive: new Date(),
				phoneNumber: user.phoneNumber,
				about: user.about
			}
		})
	} catch (error) {
		console.error("Google login error: ", error);
		res.status(400).json({success: false, message: "Login with google failed"});
	}
});
router.get('/google', passport.authenticate('google', {
	scope: ['profile', 'email']
}));

router.get('/google/callback', passport.authenticate('google', {failureRedirect:'/'}), (req, res) =>{
	const token = jwt.sign(req.user, process.env.JWT_SECRET_KEY, {expiresIn: '1h'});
	res.redirect(`http://localhost:3000?token=${token}`);
});

const isAuthenticated = (req, res, next) => {
	if(req.isAuthenticated()){
		return next();
	}
	return res.redirect('/');
}
router.get('/profile', isAuthenticated, (req, res) => {
	res.json({message: "You are logged in", user: req.user});
})
module.exports = router;