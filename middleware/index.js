var TouristPlaces=require("../models/touristplaces"),
	Comment=require("../models/comment"),
	User=require("../models/user"),
	middlewareObj={};		

middlewareObj.checkTouristPlacesOwnership = function(req,res,next){
	if(req.isAuthenticated()){
		TouristPlaces.findById(req.params.id,(err,foundTP)=>{
			if(err || !foundTP){
				req.flash("error","Sorry, something went wrong!");
				res.redirect("back");
			}
			else{
				if(foundTP.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				}
				else{
					req.flash("error","Permission Denied!");
					res.redirect("/touristplaces/"+req.params.id);
				}
			}
		});	
	}
	else{
		req.flash("error","Please login first!");
		res.redirect("/login");
	}
};

middlewareObj.checkCommentOwnership = function(req,res,next){
	if(req.isAuthenticated()){
		Comment.findById(req.params.cmnt_id,(err,foundCmnt)=>{
			if(err||!foundCmnt){
				req.flash("error","Sorry, something went wrong!");
				res.redirect("back");
			}
			else{
				if(foundCmnt.author.id.equals(req.user._id) || req.user.isAdmin){
					next();
				}
				else{
					req.flash("error","Permission Denied!");
					res.redirect("/touristplaces/"+req.params.id);
				}
			}
		});	
	}
	else{
		req.flash("error","Please login first!");
		res.redirect("/login");
	}
};

middlewareObj.checkCommentExistence=(req,res,next)=>{
    if(req.isAuthenticated()){
        TouristPlaces.findById(req.params.id).populate("comments").exec((err,foundTP)=>{
            if(err || !foundTP){
                req.flash("error","Sorry, something went wrong!");
                res.redirect("back");
            } 
			else{
				var foundUserCmnt=foundTP.comments.some((cmnt)=>{
                    return cmnt.author.id.equals(req.user._id);
                });
                if(foundUserCmnt){
                    req.flash("error", "One User can write ONLY ONE Comment (and you already wrote a comment)");
                    return res.redirect("/touristplaces/" + foundTP._id);
                }
                next();
            }
        });
    } else {
        req.flash("error", "Please login first!");
        res.redirect("back");
    }
};

middlewareObj.checkProfileOwnership = function(req,res,next){
	if(req.isAuthenticated()){
		User.findById(req.params.id,(err,foundUser)=>{
			if(err || !foundUser){
				req.flash("error","Sorry, something went wrong!");
				res.redirect("back");
			}
			else{
				if(foundUser._id.equals(req.user._id) || req.user.isAdmin){
					next();
				}
				else{
					req.flash("error","Permission Denied!");
					res.redirect("/users/"+req.params.id);
				}
			}
		});	
	}
	else{
		req.flash("error","Please login first!");
		res.redirect("/login");
	}
};

middlewareObj.checkCanFollow = function(req,res,next){
	if(req.isAuthenticated){
		User.findById(req.params.id,(err,foundUser)=>{
			if(err || !foundUser){
				req.flash("error","Sorry, something went wrong!");
                res.redirect("back");
            }
			else{
				if(foundUser._id.equals(req.user._id)){
					req.flash("error","Can't follow or unfollow yourself!");
					res.redirect("/users/"+req.params.id);
				}
				else{
					next();
				}
			}
		});
	}
	else{
        req.flash("error", "Please login first!");
        res.redirect("back");
	}
}

middlewareObj.checkIfFollowingtoFollow=(req,res,next)=>{
    if(req.isAuthenticated()){
        User.findById(req.params.id).populate("followers").exec((err,foundUser)=>{
            if(err || !foundUser){
                req.flash("error","Sorry, something went wrong!");
                res.redirect("back");
            } 
			else{
				var foundfollowing=foundUser.followers.some((follower)=>{
                    return follower._id.equals(req.user._id);
                });
                if(foundfollowing){
                    req.flash("error", "You are already following this author");
                    return res.redirect("/users/" + foundUser._id);
                }
                next();
            }
        });
    } else {
        req.flash("error", "Please login first!");
        res.redirect("back");
    }
};

middlewareObj.checkIfFollowingtoUnfollow=(req,res,next)=>{
    if(req.isAuthenticated()){
        User.findById(req.params.id).populate("followers").exec((err,foundUser)=>{
            if(err || !foundUser){
                req.flash("error","Sorry, something went wrong!");
                res.redirect("back");
            } 
			else{
				var foundfollowing=foundUser.followers.some((follower)=>{
                    return follower._id.equals(req.user._id);
                });
                if(!foundfollowing){
                    req.flash("error", "Can't unfollow as you are not following this author");
                    return res.redirect("/users/" + foundUser._id);
                }
                next();
            }
        });
    } else {
        req.flash("error", "Please login first!");
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	req.flash("error","Please login first!");
	res.redirect("/login");
}

middlewareObj.isVerified = async function(req,res,next){
	try{
		const user = await User.findOne({username: req.body.username});
		if(!user){
			req.flash("error", "Username doesn't exits")
			return res.redirect("back");
		}
		else if(user.isVerified){
			return next();
		}
		req.flash("error","Your account has not been verified. Please check your email to verify your account");
		return res.redirect("back");
	} catch(error){
		console.log(error);
		req.flash("error","Sorry, Something went wrong. Try again later");
		res.redirect("back");
	}
}

middlewareObj.checkIfAdmin=(req,res,next)=>{
	if(req.isAuthenticated()){
		User.findById(req.user._id,(err,foundUser)=>{
			if(err || !foundUser){
				req.flash("error","Sorry, something went wrong!");
                res.redirect("back");
            }
			else if(foundUser.isAdmin){
				next();
			}
			else{
				req.flash("error","Permission Denied!");
				res.redirect("back");
			}
		});
	}
	else{
		req.flash("error","Please login first!");
		res.redirect("/login");
	}
}

module.exports=middlewareObj;