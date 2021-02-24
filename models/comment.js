var mongoose=require("mongoose");

var commentSchema=new mongoose.Schema({
    rating:{
        type:Number,
        required:"Please provide a rating (1-5 stars).",
        min:1,
        max:5,
        validate:{
            validator:Number.isInteger,
            message:"{VALUE} is not an integer value."
        }
    },
    text:{
        type:String
    },
	createdAt:{
		type:Date,
		default:Date.now
	},
    author:{
        id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"User"
        },
        username:String
    }
});

module.exports=mongoose.model("Comment",commentSchema);