var express=require("express"),
	router=express.Router(),
	TouristPlaces=require("../models/touristplaces"),
	Comment=require("../models/comment"),
	User=require("../models/user"),
	Notifications=require("../models/notifications"),
	Temp=require("../models/temp"),
	middleware=require("../middleware");

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
	  if(req.query.search) {
		  var noMatch=0;
		  const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		  TouristPlaces.find({name: regex, isApproved: true}, function(err, foundTP){
			 if(err){
				 req.flash("error","Sorry, something went wrong!");
			 } 
			 else {
				 if(foundTP.length<1){
					 noMatch=1;
					 TouristPlaces.find({},(err,foundTP)=>{
						 if(err){
							 req.flash("error","Sorry, something went wrong!");
							 res.redirect("/");
						 }
						else{
							res.render("touristplaces/index", {tourPlace:foundTP, page:"touristplaces", noMatch:noMatch});
						}
					 });
				 }
				else{
					res.render("touristplaces/index", {tourPlace:foundTP, page:"touristplaces", noMatch:noMatch});
				}
			 }
		  });
	  }
	else {
		TouristPlaces.find({},(err,foundTP)=>{
			if(err || !foundTP){
				req.flash("error","Sorry, something went wrong!");
				res.redirect("/");
			}
			else {
				res.render("touristplaces/index", {tourPlace:foundTP, page:"touristplaces", noMatch:noMatch} );
			}
		});
	}
});

router.get("/pending",middleware.isLoggedIn,middleware.checkIfAdmin,(req,res)=>{
	TouristPlaces.find({isApproved:false},(err,foundTP)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			return res.redirect("/");
		}
		Temp.find({},(err,foundTemp)=>{
			if(err){
				req.flash("error","Sorry, something went wrong!");
				return res.redirect("/");
			}
			res.render("touristplaces/pending", {tourPlace:foundTP,temp:foundTemp} );
		});
	});
});

router.get("/new",middleware.isLoggedIn,(req,res)=>{
	res.render("touristplaces/new");
});

router.post("/",middleware.isLoggedIn,upload.array("images"),(req,res)=>{
	req.body.touristplaces.images=[];
	req.body.touristplaces.imageId=[];
	const name = new RegExp(escapeRegex(req.body.touristplaces.name), 'gi');
	TouristPlaces.find({name:name},(err,foundTP)=>{
		if(err){
			req.flash("error","Sorry, something went wrong1!");
			res.redirect("back")
		} 
		else {
			if(foundTP.length>=1){
				req.flash("error","A tourist attraction with same name already exists");
				res.redirect("/touristplaces")
			}
			else {
				req.body.touristplaces.author={
					id:req.user._id,
					username:req.user.username
				};
				if(req.user.isAdmin){
					req.body.touristplaces.isApproved=true;
				}
				req.files.forEach((file)=>{
					cloudinary.v2.uploader.upload(file.path,function(err,result){
						if(err){
							req.flash("error", "Sorry, something went wrong");
							return res.redirect("back");
						}
						req.body.touristplaces.images.push(result.secure_url);
						req.body.touristplaces.imageId.push(result.public_id);
						if(req.body.touristplaces.images.length==req.files.length){
							TouristPlaces.create(req.body.touristplaces,(err,foundTP)=>{
								if(err){
									req.flash("error","Sorry, something went wrong2!");
									res.redirect("/touristplaces");
								}
								else {
									if(req.user.isAdmin){
										User.findById(foundTP.author.id).populate("followers").exec((err,foundUser)=>{
										var newNotification={
											username: foundTP.author.username,
											touristplacesId: foundTP._id
										}
										foundUser.followers.forEach(function (follower){
											Notifications.create(newNotification,(err, notifications)=>{
												follower.notifications.push(notifications);
												follower.save();
											});
										});
									});
										req.flash("success","Successfully added a New Tourist Attraction !!!");
									}
									else{
										req.flash("success","Thanks for recommending the tourist attraction. (Note: If found some wrong information it will not get added else you can view it under your profile ones it gets added)");
									}
									res.redirect("/touristplaces");
								}
							});
						}
					});
				});
			}
		}
	});
});

router.post("/:id/update",middleware.isLoggedIn,upload.array("images"),(req,res)=>{
	TouristPlaces.findById(req.params.id,(err,foundTP)=>{
		if(err || !foundTP){
			req.flash("error","Sorry, something went wrong!");
			return res.redirect("/touristplaces");			
		}
		req.body.touristplaces.name=foundTP.name;
		req.body.touristplaces.author={
			id:foundTP.author.id,
			username:foundTP.author.username
		};
		req.body.touristplaces.isUpdate=true;
		if(req.files.length>0){
			foundTP.imageId.forEach((e)=>{
				cloudinary.v2.uploader.destroy(e);
			});
			req.body.touristplaces.images=[];
			req.body.touristplaces.imageId=[];
			req.files.forEach((file)=>{
				cloudinary.v2.uploader.upload(file.path,function(err,result){
					if(err){
						req.flash("error", "Sorry, something went wrong");
						return res.redirect("back");
					}
					req.body.touristplaces.images.push(result.secure_url);
					req.body.touristplaces.imageId.push(result.public_id);
					if(req.body.touristplaces.images.length==req.files.length){
						Temp.create(req.body.touristplaces,(err,touristplace)=>{
							if(err){
								req.flash("error","Sorry, something went wrong!");
								res.redirect("/touristplaces");
							}
							else {
								req.flash("success","Update request sent. (Note: If found some wrong information it will not get updated else you can view it under your profile ones it gets updated)");
								res.redirect("/touristplaces");
							}
						});
					}
				});
			});
		}
		else{
			req.body.touristplaces.images=foundTP.images;
			req.body.touristplaces.imageId=foundTP.imageId;
			Temp.create(req.body.touristplaces,(err,touristplace)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("/touristplaces");
				}
				else {
					req.flash("success","Update request sent. (Note: If found some wrong information it will not get updated else you can view it under your profile ones it gets updated)");
					res.redirect("/touristplaces");
				}
			});	
		}
	});
});

router.get("/:id/approval",middleware.checkIfAdmin,(req,res)=>{
	TouristPlaces.findById(req.params.id,(err,foundTP)=>{
			if(err || !foundTP){
				req.flash("error","Sorry, something went wrong!");
				res.redirect("back");
			}
			else {
				foundTP.isApproved=true;
				foundTP.save();
				User.findById(foundTP.author.id).populate("followers").exec((err,foundUser)=>{
				var newNotification={
					username: foundTP.author.username,
					touristplacesId: foundTP._id
				}
				foundUser.followers.forEach(function (follower){
					Notifications.create(newNotification,(err, notifications)=>{
						follower.notifications.push(notifications);
						follower.save();
					});
				});
			});
				req.flash("success","Successfully added a New Tourist Attraction !!!");
				res.redirect("/touristplaces/pending")
			}
	});
});

router.get("/:id",(req,res)=>{
	TouristPlaces.findById(req.params.id).populate({
        path:"comments",
        options:{sort: {createdAt: -1}}
    }).exec((err,foundTP)=>{
		if(err){
			req.flash("error","The tourist attraction was deleted.");
			return res.redirect("/touristplaces");
		}
		if(!foundTP){
			Temp.findById(req.params.id,(err,foundTemp)=>{
				if(err || !foundTemp){
					req.flash("error","The tourist attraction was deleted.");
					return res.redirect("/touristplaces");
				}
				res.render("touristplaces/show", {tourPlace:foundTemp} );
			});
		}else{
			res.render("touristplaces/show", {tourPlace:foundTP} );
		}
	});
});

router.get("/:id/edit",middleware.checkTouristPlacesOwnership,(req,res)=>{
	TouristPlaces.findById(req.params.id,(err,foundTP)=>{
			res.render("touristplaces/edit",{tourPlace:foundTP});
	});
});

router.put("/:id",middleware.checkIfAdmin,upload.array("images"),(req,res)=>{
	TouristPlaces.findById(req.params.id,(err,foundTP)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			return res.redirect("back");	
		}
		if(foundTP){
			if(req.files.length>0){
				foundTP.imageId.forEach((e)=>{
					cloudinary.v2.uploader.destroy(e);
				});
				req.body.touristplaces.images=[];
				req.body.touristplaces.imageId=[];
				req.files.forEach((file)=>{
					cloudinary.v2.uploader.upload(file.path,function(err,result){
						if(err){
							req.flash("error", "Sorry, something went wrong");
							return res.redirect("back");
						}
						req.body.touristplaces.images.push(result.secure_url);
						req.body.touristplaces.imageId.push(result.public_id);
						if(req.body.touristplaces.images.length==req.files.length){
							TouristPlaces.findByIdAndUpdate(foundTP._id,req.body.touristplaces,(err,touristplace)=>{
								if(err){
									req.flash("error","Sorry, something went wrong!");
									res.redirect("/touristplaces");
								}
								else {
									req.flash("success","Successfully Updated the Tourist Attraction information !!!");
									res.redirect("/touristplaces/"+req.params.id);
								}
							});
						}
					});
				});
			}
			else{
				TouristPlaces.findByIdAndUpdate(foundTP._id,req.body.touristplaces,(err,touristplace)=>{
					if(err){
						req.flash("error","Sorry, something went wrong!");
						res.redirect("/touristplaces");
					}
					else {
						req.flash("success","Successfully Updated the Tourist Attraction information !!!");
						res.redirect("/touristplaces/"+req.params.id);
					}
				});
			}
		}
		else{
			Temp.findById(req.params.id,(err,foundTemp)=>{
				if(err){
					req.flash("error","Sorry, something went wrong1!");
					return res.redirect("back");
				}
				Temp.findByIdAndRemove(req.params.id,(err,deletedTemp)=>{
					if(err){
						req.flash("error","Sorry, something went wrong3!");
						return res.redirect("back");
					}
				});
				TouristPlaces.findOne({name:foundTemp.name},(err,foundtp)=>{
					if(err){
						req.flash("error","Sorry, something went wrong2!");
						return res.redirect("/touristplaces");
					}
					foundtp.images=foundTemp.images;
					foundtp.imageId=foundTemp.imageId;
					foundtp.description=foundTemp.description;
					foundtp.location=foundTemp.location;
					foundtp.save();
					req.flash("success","Successfully Updated the Tourist Attraction information !!!");
					res.redirect("/touristplaces/"+foundtp._id);
				});
			});
		}
	});
});

router.delete("/:id",middleware.checkIfAdmin,(req,res)=>{
	TouristPlaces.findByIdAndRemove(req.params.id,(err,deletedTP)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			deletedTP.imageId.forEach((e)=>{
				cloudinary.v2.uploader.destroy(e);
			});
			Comment.deleteMany({_id:{$in:deletedTP.comments}},(err)=>{
				if(err){
					console.log(err);
				}
			});
			Temp.deleteMany({name:deletedTP.name},(err)=>{
				if(err){
					console.log(err);
				} 
			});
			req.flash("success","Successfully Deleted the Tourist Attraction !!!");
			res.redirect("/touristplaces");
		}
	});
});

router.delete("/:id/reject",middleware.checkIfAdmin,(req,res)=>{
	Temp.findByIdAndRemove(req.params.id,(err,deletedTP)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			return res.redirect("back");
		}
			res.redirect("/touristplaces/pending");
	});
});

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports=router;