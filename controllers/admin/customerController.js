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

        const limit = 6;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } }
            ]
        })
        .sort({ createdOn: -1 })
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

        res.render("admin/users", {
            data: userData,
            totalPages,
            currentPage: page
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
        res.redirect("/admin/users?status=blocked");
        
    } catch (error) {
        console.log("Error found in Blockingcustomer side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const unblockCustomer = async (req,res) => {

    try { 

        const id = req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/users?status=unblocked");
        
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