var express=require("express"),
	router=express.Router(),
	TouristPlaces=require("../models/touristplaces"),
	User=require("../models/user"),
	Comment=require("../models/comment"),
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

router.get("/:id",(req, res)=>{
  User.findById(req.params.id, (err,foundUser)=>{
    if(err || !foundUser) {
      req.flash("error", "Sorry, Something went wrong.");
      return res.redirect("/");
    }
    TouristPlaces.find().where('author.id').equals(foundUser._id).exec((err,foundTP)=>{
      if(err) {
        req.flash("error", "Sorry, Something went wrong.");
        return res.redirect("/");
      }
      res.render("users/show", {user:foundUser, tourPlace:foundTP});
    })
  });
});

router.get("/:id/edit",middleware.checkProfileOwnership,(req,res)=>{
	User.findById(req.params.id,(err,foundUser)=>{
		res.render("users/edit",{user:foundUser});
	});
});

router.put("/:id",middleware.checkProfileOwnership,upload.single("profileimage"),(req,res)=>{
	User.findById(req.params.id,async(err,foundUser)=>{
		if(err || !foundUser){
			req.flash("error","Sorry, something went wrong.");
			return res.redirect("back");
		}
		if(req.file){
			try{
				if(foundUser.profileimageId){
					await cloudinary.v2.uploader.destroy(foundUser.profileimageId);
				}
				var result = await cloudinary.v2.uploader.upload(req.file.path);
				req.body.user.profileimage=result.secure_url;
				req.body.user.profileimageId=result.public_id;
			}catch(err){
				req.flash("error", err.message);
                return res.redirect("back");
			}
			User.findByIdAndUpdate(req.params.id,req.body.user,(err,updatedTP)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("back");
				}
				else{
					req.flash("success","Successfully Updated the Profile !!!");
					res.redirect("/users/"+req.params.id);
				}
			});
		}
		else{
			User.findByIdAndUpdate(req.params.id,req.body.user,(err,updatedTP)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("back");
				}
				else{
					req.flash("success","Successfully Updated the Profile !!!");
					res.redirect("/users/"+req.params.id);
				}
			});
		}
	});
});

router.get("/:id/follow",middleware.isLoggedIn, middleware.checkCanFollow, middleware.checkIfFollowingtoFollow, (req,res)=>{
	User.findById(req.user._id,(err, foundUser)=>{
		if(err || !foundUser){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");	
		}
		else{
			foundUser.following.push(req.params.id);
			foundUser.save();
		}
	});
	User.findById(req.params.id,(err, foundUser)=>{
		if(err || !foundUser){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");	
		}
		else{
			foundUser.followers.push(req.user._id);
			foundUser.save();
			req.flash("success", "Following "+foundUser.username+" !!!");
			res.redirect("/users/"+req.params.id);
		}
	});	
});

router.get("/:id/unfollow",middleware.isLoggedIn, middleware.checkCanFollow, middleware.checkIfFollowingtoUnfollow, (req,res)=>{
	User.findByIdAndUpdate(req.user._id,{$pull:{following:req.params.id}},{new: true}).populate("following").exec((err,foundUser)=>{
            if(err || !foundUser){
                req.flash("error","Sorry, something went wrong!");
                return res.redirect("back");
            }
        });
	User.findByIdAndUpdate(req.params.id,{$pull:{followers:req.user._id}},{new: true}).populate("followers").exec((err,foundUser)=>{
            if(err || !foundUser){
                req.flash("error","Sorry, something went wrong!");
                return res.redirect("back");
            }
			else{
 			req.flash("success", "Unfollowed "+foundUser.username+" !!!");
			res.redirect("/users/"+req.params.id);				
			}
        });
});

router.get("/:id/followers",(req,res)=>{
	User.findById(req.params.id).populate({
		path:"followers",
		options:{sort: {"_id": -1}}
	}).exec((err,foundUser)=>{
		if(err || !foundUser){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");	
		}
		else{
			res.render("users/followers",{user:foundUser});
		}	
	});
});

router.get("/:id/following",(req,res)=>{
	User.findById(req.params.id).populate({
		path:"following",
		options:{sort: {"_id": -1}}
	}).exec((err,foundUser)=>{
		if(err || !foundUser){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");	
		}
		else{
			res.render("users/following",{user:foundUser});
		}	
	});
});

router.get("/:id/notifications",middleware.isLoggedIn,(req,res)=>{
	User.findById(req.params.id).populate({
		path:"notifications",
		options:{sort: {"_id":-1}}
	}).exec((err,foundUser)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");	
		}
		else{
			res.render("users/notifications",{user:foundUser});
		}	
	});
});

router.get("/:id/notifications/:noti_id",middleware.isLoggedIn,(req,res)=>{
	Notifications.findById(req.params.noti_id,(err,foundNotification)=>{
		if(err || !foundNotification){
			req.flash("error","The tourist attraction was deleted.");
			res.redirect("back");	
		}
		else{
		foundNotification.isRead=true;
		foundNotification.save();
		res.redirect("/touristplaces/"+foundNotification.touristplacesId);	
		}
	});
});

router.delete("/:id",middleware.checkProfileOwnership,(req,res)=>{
	User.findByIdAndRemove(req.params.id,(err,deletedAcc)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			var author={
				id:deletedAcc._id,
				username:deletedAcc.username
			}
			TouristPlaces.deleteMany({author:author},(err)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					return res.redirect("back");
				}
			}); 
			Comment.deleteMany({author:author},(err)=>{
				if(err){
					console.log(err);
				}
				TouristPlaces.find({}).populate("comments").exec((err,foundTP)=>{
					if(err){
						req.flash("error","Sorry, something went wrong!");
						return res.redirect("back");
					}
					foundTP.forEach(function(tp){
						tp.rating=calculateAverage(tp.comments);
						tp.save();
					});
				});
			});
			Temp.deleteMany({author:author},(err)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					return res.redirect("back");
				}
			});
			cloudinary.v2.uploader.destroy(deletedAcc.profileimageId);
			if(req.user.username==deletedAcc.username){
				req.logout();
			}
			req.flash("success","Successfully deleted the account!!!");
			res.redirect("/touristplaces");
		}
	});
});

function calculateAverage(comments){
    if(comments.length===0){
        return 0;
    }
    var sum=0;
    comments.forEach(function(cmnt){
        sum+=cmnt.rating;
    });
    return (sum/comments.length);
}

module.exports=router;