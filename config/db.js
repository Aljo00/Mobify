const mongoose = require("mongoose");

const env = require("dotenv").config();

//function for connecting our project with Database.
const connectDB = async () =>{
    try {
        
        await mongoose.connect(process.env.MONGODB_URI);        
        console.log("Database is connected properly")

    } catch (error) {
        
        console.log("Database is not connection. there is a error :-", error.message);
        process.exit(1);

    }
}

module.exports = {
    connectDB
}