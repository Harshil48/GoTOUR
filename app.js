require("dotenv").config();

var express=require("express"),
	app=express(),
	bodyParser=require("body-parser"),
	mongoose=require("mongoose"),
	flash=require("connect-flash"),
	passport=require("passport"),
	localStrategy=require("passport-local"),
	passportLocalMongoose=require("passport-local-mongoose"),
	methodOverride=require("method-override"),
	expressSanitizer=require("express-sanitizer"),
	TouristPlaces=require("./models/touristplaces"),
	Comment=require("./models/comment"),
	User=require("./models/user"),
	TravelAgencies=require("./models/travelagencies"),
	Notifications=require("./models/notifications"),
	Temp=require("./models/temp");

var touristplacesRoutes=require("./routes/touristplaces"),
	commentRoutes=require("./routes/comments"),
	indexRoutes=require("./routes/index"),
	userRoutes=require("./routes/users"),
	travelagenciesRoutes=require("./routes/travelagencies");
	

var url= process.env.DATABASEURL || "mongodb://localhost/GoTOUR";
	
mongoose.connect(url,{
	useNewUrlParser:true,
	useCreateIndex:true,
	useUnifiedTopology:true,
	useFindAndModify:false
});

app.use(bodyParser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());
app.use(expressSanitizer());
app.locals.moment=require("moment");

app.use(require("express-session")({
	secret:"Secret",
	resave:false,
	saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async function(req, res, next){
	res.locals.currentUser=req.user;
	if(req.user){
		try{
			let user=await User.findById(req.user._id).populate('notifications', null,{isRead:false}).exec();
			res.locals.notifications=user.notifications.reverse();
		} catch(err){
			console.log(err.message);
		}
	}
	res.locals.error=req.flash("error");
	res.locals.success=req.flash("success");
	next();
});

app.use("/",indexRoutes);
app.use("/touristplaces",touristplacesRoutes);
app.use("/touristplaces/:id/comments",commentRoutes);
app.use("/users",userRoutes);
app.use("/travelagencies",travelagenciesRoutes);

app.use("*",(req,res)=>{
	res.send("Sorry page not found!")
});

app.listen(process.env.PORT || 3000,process.env.IP,()=>{
	console.log("The GoTOUR Server has started...");
});