const express = require("express");
const app = express();

//requiring .env file to the server.
const env = require("dotenv").config();

//requiring path module to work with files paths.
const path = require("path");

//requiring the user_routes file
const user_route = require("./routes/user_routes");

//midlleware uses for parsing json data and encoding the url datas
app.use(express.json());
app.use(express.urlencoded({extended:true}))

//Requiring the config file to the server to connect the server to the database.
const db = require("./config/db");
db.connectDB();

//setting the view engine and public folder
app.set("view engine", "ejs");
app.set("views", './views');

app.use(express.static('public'));

app.use('/',user_route);

//Starting the server
const PORT = process.env.PORT || 3005
app.listen(PORT, ()=>{
    console.log("Server is Running");
});

module.exports = app