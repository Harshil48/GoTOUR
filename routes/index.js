var express=require("express"),
	router=express.Router(),
	passport=require("passport"),
	User=require("../models/user"),
	TouristPlaces=require("../models/touristplaces"),
	middleware=require("../middleware");

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const crypto=require("crypto");

var multer = require('multer');
var storage = multer.diskStorage({
	filename: function(req, file, callback) {
		callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'gotour', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get("/",(req,res)=>{
	res.render("landingPage");
});

router.get("/register",(req,res)=>{
	if(req.user){
		req.flash("error", "You are currently logged in. Logout and try again")
		return res.redirect("/touristplaces")
	}
	res.render("register",{page:"register"});
});

router.post("/register", upload.single("profileimage") ,async function(req,res){
	try{
		if(req.file){
			var result=await cloudinary.v2.uploader.upload(req.file.path);
  			req.body.user.profileimage=result.secure_url;
			req.body.user.profileimageId=result.public_id;	
		}
		req.body.user.emailToken=crypto.randomBytes(64).toString("hex");
		req.body.user.isVerified=false;						   					   
		if(req.body.user.admincode == 'ds12ds13hb16'){
			req.body.user.isAdmin = true;
		}
		if(req.body.user.confirmpassword !== req.body.user.password){
			req.flash("error", "Password and Confirm Password do not match");
			return res.redirect("/register");
		}
		User.register(req.body.user,req.body.user.password,async (err,user)=>{
			if(err){
				return res.render("register",{error:err.message});	
			}
			const msg = {
				to: req.sanitize(user.email),
				from: "harshilbhorawat@gmail.com",
				subject: req.sanitize("GoTOUR : Email Verification"),
				text: `
					Thanks for registering to GoTOUR.	
					Click the link below to verify your account.
					https://${req.headers.host}/verify-email?token=${user.emailToken}
					` ,
				html: `
					<p>Thanks for registering to GoTOUR.</p>
					<p>Click the link below to verify your account</p>    
					<p><h3><a href="https://${req.headers.host}/verify-email?token=${user.emailToken}">Verify your account</a></h3></p>
					`
			};
			try {
				await sgMail.send(msg);
				req.flash("success","Thanks for registering.Please check your email to verify your account");
				res.redirect("back");
			} catch (error) {
				console.error(error);
				if (error.response) {
					console.error(error.response.body)
				}
				req.flash("error","Sorry, Something went wrong. Try again later");
				res.redirect("back");
			}
		});
	}catch(err){
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");
	}
});

router.get("/verify-email", async(req, res, next) => { 
	try {
		if(req.query.token==null){
			req.flash("error", "Invalid Token.");
			return res.redirect("back");
		}
		const user = await User.findOne({ emailToken: req.query.token });
		if (!user) {
			req.flash("error", "Token is invalid. Cannot Verify your account");
			return res.redirect("back"); 
			user.isAdmin = false;
		}
		user.emailToken = null; 
		user.isVerified = true;
		await user.save();
		await req.login(user, async (err) => {
			if (err) return next(err);
			req.flash("success", "Welcome to GoTOUR "+user.username+" !!!");
			const redirectUrl = req.session.redirectTo || "/touristplaces"; 
			delete req.session.redirectTo;
			res.redirect(redirectUrl);
		});
	} catch (error) {
		console.log(error);
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");
	}
});

router.get("/login",(req,res)=>{
	if(req.user){
		req.flash("error", "You are currently logged in. Logout and try again")
		return res.redirect("/touristplaces")
	}
	res.render("login",{page:"login"});
});

router.post("/login",middleware.isVerified,passport.authenticate("local",{
	successRedirect:"/touristplaces",
	failureRedirect:"/login",
	failureFlash:true
}),(req,res)=>{
	
});

router.get("/logout",(req,res)=>{
	req.logout();
	req.flash("success","Successfully logged out !!!")
	res.redirect("/touristplaces");
});

router.get("/contact",middleware.isLoggedIn,(req,res)=>{
	res.render("contact");
});

router.post("/contact", middleware.isLoggedIn,async(req,res)=>{
	User.findById(req.user._id,async (err,user)=>{
		if(err){
			req.flash("error","Sorry, Something went wrong. Try again later");
			res.redirect("back");
		}
		try {
			const msg = {
				to: "harshilbhorawat@gmail.com",
				from: req.user.email,
				subject: req.sanitize("GoTOUR : "+req.body.subject+" (from "+req.user.firstname+" "+req.user.lastname+")"),
				text: req.sanitize(req.body.message),
				html: req.sanitize(req.body.message)
			};
			await sgMail.send(msg);
			req.flash("success","Successfully sent your message. We will get back to you shortly");
			res.redirect("back");
		} catch (error) {
			console.error(error);
			if (error.response) {
				console.error(error.response.body)
			}
			req.flash("error","Sorry, Something went wrong. Try again later");
			res.redirect("back");
		}
	});
});

router.get("/forgot",(req,res)=>{
	if(req.user){
		req.flash("error", "You are currently logged in. Logout and try again")
		return res.redirect("/touristplaces")
	}
	res.render("forgot");
});

router.post("/forgot",async(req,res,next)=>{
	try {
		const user = await User.findOne({ username: req.body.username });
		if (!user) {
			req.flash("error","Username doesn't exists");
			return res.redirect("back");
		}
		else if(!(user.isVerified)){
			req.flash("error","Your account is not verified. Please check your email to verify your account");
			return res.redirect("back");
		}
		user.resetToken=crypto.randomBytes(64).toString("hex");
		await user.save();
		const msg = {
					to: req.sanitize(user.email),
					from: "harshilbhorawat@gmail.com",
					subject: req.sanitize("GoTOUR : Password Reset"),
					text: `
						Click the link below to Reset your Password.
						https://${req.headers.host}/reset?token=${user.resetToken}
						` ,
					html: `
						<p>Click the link below to Reset your Password.</p>    
						<p><h3><a href="https://${req.headers.host}/reset?token=${user.resetToken}">Reset your password</a></h3></p>
						`
				};
		await sgMail.send(msg);
		req.flash("success","An email is sent to your registered email-address with further instructions to reset your password");
		res.redirect("back");
	} catch (error) {
		console.log(error);
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");
	}
});

router.get("/reset",async(req,res,next)=>{
	try{
		if(req.query.token==null){
			req.flash("error", "Invalid Token.");
			return res.redirect("back");
		}
		const user = await User.findOne({ resetToken: req.query.token });
		if (!user) {
			req.flash("error", "Token is invalid. Cannot Reset your password");
			return res.redirect("back"); 
		}
		res.render("reset",{token:req.query.token});
	}catch(error){
		console.log(error);
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");
	}
});

router.post("/reset",async(req,res,next)=>{
	try{
		if(req.query.token==null){
			req.flash("error", "Invalid Token.");
			return res.redirect("back");
		}
		const user = await User.findOne({ resetToken: req.query.token });
		if (!user) {
			req.flash("error", "Token is invalid. Cannot Reset your password");
			return res.redirect("back");
		}
		if(req.body.confirmpassword !== req.body.password){
			req.flash("error", "Password and Confirm Password do not match");
			return res.redirect("back");
		}
		await user.setPassword(req.body.password);
		user.resetToken=null;
		await user.save();
		await req.login(user, async (err) => {
			if (err) return next(err);
			req.flash("success", "Successfully changed your Password !!!");
			const redirectUrl = req.session.redirectTo || "/touristplaces"; 
			delete req.session.redirectTo;
			res.redirect(redirectUrl);
		});
	}catch(error){
		console.log(error);
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");	
	}
});

router.get("/aboutUs",(req,res)=>{
	res.render("aboutUs");
});

module.exports=router;