const Brand = require("../../models/brandSchema");

const loadBrandPage = async (req,res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page-1)* limit ;

        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);

        res.render("admin/brands",{
            brands:brandData,
            currentPage: page,
            totalPages: totalPages,
            totalBrands: totalBrands
        })
        
    } catch (error) {
        console.log("Error found in loading brand page side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const addBrands = async (req,res) => {

    try {

        console.log(req.body.brand)
        const brandName = req.body.brand;
        const findBrand = await Brand.findOne({brandName});
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName:brandName,
                brandImage:image
            });

            await newBrand.save();
            res.redirect("/admin/brands")
        }
        
    } catch (error) {
        console.log("Error found in Adding new brand side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

module.exports = {
    loadBrandPage,
    addBrands
}