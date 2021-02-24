var express=require("express"),
	router=express.Router({mergeParams:true}),
	TouristPlaces=require("../models/touristplaces"),
	Comment=require("../models/comment"),
	middleware=require("../middleware");

router.get("/",(req,res)=>{
    TouristPlaces.findById(req.params.id).populate({
        path: "comments",
        options: {sort: {createdAt: -1}}
    }).exec((err,foundTP)=>{
        if (err || !foundTP){
            req.flash("error","Sorry, something went wrong!");
            return res.redirect("back");
        }
        res.render("comments/index", {tourPlace:foundTP});
    });
});
	
router.get("/new",middleware.isLoggedIn,middleware.checkCommentExistence,(req,res)=>{
	TouristPlaces.findById(req.params.id,(err,foundTP)=>{
		if(err || !foundTP){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			res.render("comments/new", {tourPlace:foundTP} );
		}
	});
});

router.post("/",middleware.isLoggedIn,middleware.checkCommentExistence,(req,res)=>{
	TouristPlaces.findById(req.params.id).populate("comments").exec((err,foundTP)=>{
		if(err||!foundTP){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			Comment.create(req.body.comment,(err,comment)=>{
				if(err){
					req.flash("error","Sorry, something went wrong!");
					res.redirect("back");
				}
				else{
					comment.author.id=req.user._id;
					comment.author.username=req.user.username;
					comment.save();
					foundTP.comments.push(comment);
					foundTP.rating=calculateAverage(foundTP.comments);
					foundTP.save();
					req.flash("success","Successfully Added a New Comment !!!");
					res.redirect("/touristplaces/"+foundTP._id);
				}
			});
		}
	});
});

router.get("/:cmnt_id/edit",middleware.checkCommentOwnership,(req,res)=>{
	Comment.findById(req.params.cmnt_id,(err,foundCmnt)=>{
		if(err||!foundCmnt){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			res.render("comments/edit",{tourPlace_id:req.params.id, cmnt:foundCmnt});
		}
	});
});

router.put("/:cmnt_id",middleware.checkCommentOwnership,(req,res)=>{
	Comment.findByIdAndUpdate(req.params.cmnt_id,req.body.comment,{new:true},(err,updatedCmnt)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
        	TouristPlaces.findById(req.params.id).populate("comments").exec((err,foundTP)=>{
            	if(err){
					req.flash("error","Sorry, something went wrong!");
                	return res.redirect("back");
            	}
            	foundTP.rating=calculateAverage(foundTP.comments);
            	foundTP.save();
				req.flash("success","Successfully Updated the Comment !!!");
				res.redirect("/touristplaces/"+req.params.id);
			});
		}
	});
});

router.delete("/:cmnt_id",middleware.checkCommentOwnership,(req,res)=>{
	Comment.findByIdAndRemove(req.params.cmnt_id,(err,deletedCmnt)=>{
		if(err){
			req.flash("error","Sorry, something went wrong!");
			res.redirect("back");
		}
		else{
			TouristPlaces.findByIdAndUpdate(req.params.id,{$pull:{comments:req.params.cmnt_id}},{new: true}).populate("comments").exec((err,foundTP)=>{
            if(err){
                req.flash("error","Sorry, something went wrong!");
                return res.redirect("back");
            }
            foundTP.rating=calculateAverage(foundTP.comments);
            foundTP.save();
			req.flash("success","Successfully Deleted the Comment !!!");
			res.redirect("/touristplaces/"+req.params.id);
        });
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