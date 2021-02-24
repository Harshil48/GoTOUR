var mongoose=require("mongoose"),
	passportLocalMongoose=require("passport-local-mongoose");

var userSchema=new mongoose.Schema({
	username:String,
	password:String,
	profileimage: {
		type:String,
		default:"https://res.cloudinary.com/gotour/image/upload/v1605517153/default_vejss9.png"
	},
	profileimageId: String,
    firstname: String,
    lastname: String,
    email: String,
	emailToken: String,
	resetToken: String,
	isVerified:{
		type: Boolean, 
		default: false
	},
	about: String,
	isAdmin:{
		type: Boolean, 
		default: false
	},
	followers:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		}
	],
	following:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"User"
		}
	],
	notifications:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Notifications"			
		}
	]
});

userSchema.plugin(passportLocalMongoose);

module.exports=mongoose.model("User",userSchema);