const Brand = require("../../models/brandSchema");

//This controller is used for rendering Brand page in the admin side.
const loadBrandPage = async (req,res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)* limit ;

        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        console.log(`Admin Side :-- Brand Management page rendered succesfully.`)
        console.log(`Total Brands count is ${totalBrands}`)
        console.log("==========");
        const totalPages = Math.ceil(totalBrands/limit);

        res.render("admin/brands",{
            brands:brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        })
        
    } catch (error) {
        console.log(`Admin Side :-- Brand Management page rendering Failed. Because `, error.message)
        console.log("==========");
        res.redirect("/admin/error");
    }
    
}

//This controller add new brands to the database.
const addBrands = async (req,res) => {

    try {
        const brandName = req.body.brand;
        const findBrand = await Brand.findOne({brandName});
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName:brandName,
                brandImage:image
            });

            await newBrand.save();
            console.log(`Admin Side :-- Adding New brand is successfully completed.`)
            console.log(`This is the New brand the admin added  ${brandName}`)
            console.log("==========");
            res.redirect("/admin/brands")
        }
        
    } catch (error) {
        console.log(`Admin Side :-- Adding New brand is Failed. Because ${error.message}`)
        console.log("==========");
        res.redirect("/admin/error");
    }
    
}

module.exports = {
    loadBrandPage,
    addBrands
}