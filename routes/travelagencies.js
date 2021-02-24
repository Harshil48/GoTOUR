var express=require("express"),
	router=express.Router({mergeParams:true}),
	User=require("../models/user"),
	TravelAgencies=require("../models/travelagencies"),
	middleware=require("../middleware");

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
	TravelAgencies.find({},(err,foundtraAg)=>{
		if(err){
			req.flash("error", "Sorry, something went wrong.");
			return res.redirect("back");
		}
		res.render("travelagencies/index",{traAg:foundtraAg});
	});
});

router.get("/new",middleware.checkIfAdmin,(req,res)=>{
	res.render("travelagencies/new");
});

router.post("/",middleware.checkIfAdmin,upload.single("image"),(req,res)=>{
	TravelAgencies.findOne({name:req.body.travelagencies.name},async(err,foundtraAg)=>{
		if(err){
			req.flash("error", "Sorry, something went wrong.");
			return res.redirect("back");
		}
		if(foundtraAg){
			req.flash("error","Travel Agency already exists.");
			return res.redirect("back");
		}
		try{
			var result=await cloudinary.v2.uploader.upload(req.file.path);
			req.body.travelagencies.image=result.secure_url;
			req.body.travelagencies.imageId=result.public_id;
			TravelAgencies.create(req.body.travelagencies,(err,traAg)=>{
				if(err){
					req.flash("error", "Sorry, something went wrong.");
					return res.redirect("back");
				}
				req.flash("success","Successfully added a new Travel Agency !!!");
				res.redirect("/travelagencies");
			});
		}catch(err){
			req.flash("error", "Sorry, something went wrong.");
			res.redirect("back");
		}
	});
});

router.get("/:id/contact",middleware.isLoggedIn,(req,res)=>{
	TravelAgencies.findById(req.params.id,(err,foundtraAg)=>{
		if(err){
			req.flash("error", "Sorry, something went wrong.");
			return res.redirect("back");
		}
		res.render("travelagencies/contact",{traAg:foundtraAg});
	});
});

router.post("/:id/contact", middleware.isLoggedIn,async(req,res)=>{
	User.findById(req.user._id,async (err,user)=>{
		if(err){
			req.flash("error","Sorry, Something went wrong. Try again later");
			res.redirect("back");
		}
		TravelAgencies.findById(req.params.id,async (err,foundtraAg)=>{
			if(err){
				req.flash("error","Sorry, Something went wrong. Try again later");
				res.redirect("back");
			}
			try {
				const msg = {
					to: foundtraAg.email,
					from: req.user.email,
					subject: req.sanitize("GoTOUR : "+req.body.subject+" (from "+req.user.firstname+" "+req.user.lastname+")"),
					text: req.sanitize(req.body.message),
					html: req.sanitize(req.body.message)
				};
				await sgMail.send(msg);
				req.flash("success","Successfully sent your message.");
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
});

router.get("/:id/edit",middleware.checkIfAdmin,(req,res)=>{
	TravelAgencies.findById(req.params.id,(err,foundtraAg)=>{
		if(err){
			req.flash("error", "Sorry, something went wrong.");
			return res.redirect("back");
		}
		res.render("travelagencies/edit",{traAg:foundtraAg});
	});
});

router.put("/:id",middleware.checkIfAdmin,upload.single("image"),(req,res)=>{
	TravelAgencies.findById(req.params.id,async(err,foundtraAg)=>{
		if(err || !foundtraAg){
			req.flash("error", "Sorry, something went wrong.");
			return res.redirect("back");
		}
		if(req.file){
			try{
				await cloudinary.v2.uploader.destroy(foundtraAg.imageId);
				var result = await cloudinary.v2.uploader.upload(req.file.path);
				req.body.travelagencies.image=result.secure_url;
				req.body.travelagencies.imageId=result.public_id;
			}catch(err){
				req.flash("error", err.message);
                return res.redirect("back");
			}
			TravelAgencies.findByIdAndUpdate(req.params.id,req.body.travelagencies,(err,updatedTP)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("back");
				}
				else{
					req.flash("success","Successfully Updated the Travel Agency!!!");
					res.redirect("/travelagencies/");
				}
			});
		}else{
			TravelAgencies.findByIdAndUpdate(req.params.id,req.body.travelagencies,(err,updatedTP)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("back");
				}
				else{
					req.flash("success","Successfully Updated the Travel Agency!!!");
					res.redirect("/travelagencies/");
				}
			});
		}
	});
});

router.delete("/:id",middleware.checkIfAdmin,(req,res)=>{
	TravelAgencies.findByIdAndRemove(req.params.id,(err,deletedtraAg)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			return res.redirect("back");
		}
		cloudinary.v2.uploader.destroy(deletedtraAg.imageId);
		req.flash("success","Successfully Deleted the Travel Agency!!!");
		res.redirect("/travelagencies/");
	});
});

module.exports=router;