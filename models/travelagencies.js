var mongoose=require("mongoose");

var travelagenciesSchema=new mongoose.Schema({
	name:String,
	image: String,
	imageId: String,
    email: String,
});

module.exports=mongoose.model("TravelAgencies",travelagenciesSchema);