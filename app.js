const express = require("express");
const app = express();

//requiring .env file to the server.
const env = require("dotenv").config();

//requiring the session module to handle the sessions
const session = require('express-session')

//requiring the user_routes file
const user_route = require("./routes/user_routes");

const admin_route = require("./routes/admin_routes");

const userAuth = require("./middleware/JWTUserAuth")

const passport = require("./config/passport");

const nocache = require("nocache")

const cookieParser = require("cookie-parser");
app.use(cookieParser());

//midlleware uses for parsing json data and encoding the url datas
app.use(express.json());
app.use(express.urlencoded({extended:true}))

//Requiring the config file to the server to connect the server to the database.
const db = require("./config/db");
db.connectDB();

const resetCategoryOffer = require("./helpers/categoryOfferReseting");
const resetCouponOffer = require("./helpers/couponResetting");
const cron = require("node-cron");

// Run every minute for testing
cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log("Cron job started at", now);

  try {

    await resetCategoryOffer();
    await resetCouponOffer();
    
  } catch (error) {
    console.error("Error in cron job:", error);
  }

});

app.use((req,res,next,err)=>{
    if(err){
        console.log(err.message);
        res.redirect("/page404"); 
    }else{
        next();
    }
})

//intializing the session
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie:{
        secure: false,
        httpOnly: true,
        maxAge:72*60*60*1000
    }
}));

app.use(nocache());

app.use(passport.initialize());
app.use(passport.session());

//setting nocache
app.use((req,res,next)=>{
    res.set('cache-control','no-store');
    next();
})

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

//setting the view engine and public folder
app.set("view engine", "ejs");
app.set("views", './views');

app.use(express.static('public'));

app.use('/',userAuth.user_IsBlocked,user_route);
app.use('/admin',admin_route);

//Starting the server
const PORT = process.env.PORT || 3005
app.listen(PORT, ()=>{
    console.log("Server is Running");
});

module.exports = app