var mongoose=require("mongoose");

var touristplacesSchema=new mongoose.Schema({
	name:String,
	images:[],
	imageId:[],
	description:String,
	location:String,
	isApproved:{
		type:Boolean,
		default:false
	},
	isUpdate:{
		type:Boolean,
		default:false
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
	},
	comments:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Comment"
		},
	],
	rating:{
	type: Number,
	default: 0,
	}
});

module.exports=mongoose.model("TouristPlaces",touristplacesSchema);