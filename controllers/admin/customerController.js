const User = require("../../models/userSchema");



const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 3;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        // Pass data to the view
        res.render("admin/users", {
            data: userData, // The user data for the table
            totalPages, // Total number of pages for pagination
            currentPage: page // Current page number
        });
    } catch (error) {
        console.log("Error found in customerManagement side: ", error.message);
        res.redirect("/admin/error");
    }
};

const blockCustomer = async (req,res) => {

    try { 

        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users");
        
    } catch (error) {
        console.log("Error found in Blockingcustomer side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const unblockCustomer = async (req,res) => {

    try { 

        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/users");
        
    } catch (error) {
        console.log("Error found in Blockingcustomer side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
}