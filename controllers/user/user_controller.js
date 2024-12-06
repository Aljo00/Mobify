

const load_landing = async (req,res) => {
    
    try {

        console.log("user in landing page")
        return res.render("user/home");
        
    } catch (error) {
        console.log("error found:- ",error.message);
        res.status(500).send("Server error")
    }

}

module.exports = {
    load_landing
}