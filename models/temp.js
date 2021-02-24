var mongoose=require("mongoose");

var tempSchema=new mongoose.Schema({
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
		default:true
	},
	author:{
		id:{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		},
		username:String
	},
});

module.exports=mongoose.model("Temp",tempSchema);