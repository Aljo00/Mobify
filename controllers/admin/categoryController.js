const Category = require("../../models/categorySchema");


const categoryInfo = async (req,res) => {

    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1)* limit;

        const categoryData = await Category.find({isListed: true})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await Category.countDocuments({ isListed: true })
        const totalPages = Math.ceil(totalCategories / limit);  

        res.render("admin/category",{
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        });
        
    } catch (error) {
        console.log("Error found in categoryManagement side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const addCategory = async (req, res) => {
    const { name, description } = req.body;

    try {
        // Check if the category already exists
        const existingCategory = await Category.findOne({ name }); // Use findOne for a single document
        if (existingCategory) {
            return res.status(400).json({ error: "Category already exists.." }); // Add `return` to prevent further execution
        }

        // Create a new category
        const newCategory = new Category({
            name,
            description,
        });
        await newCategory.save();

        // Send success response
        return res.status(200).json({ message: "Category added successfully" });
    } catch (error) {
        console.log("Error found in Adding category side: ", error.message);

        // Handle unexpected errors
        return res.status(500).json({ error: "Internal server error" });
    }
}

const getEditCategory = async (req,res) => {

    try {

        const id = req.query.id;
        const category = await Category.findOne({_id: id});
        res.render('admin/editCategory',{category:category})
        
    } catch (error) {
        console.log("Error found in categoryManagement side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const editCategory = async (req,res) => {

    try {

        id = req.params.id;
        const {name,description} = req.body;

        const updateCategory = await Category.findByIdAndUpdate(id,{
            name:name,
            description: description
        },{new: true})

        if(updateCategory){
            res.redirect('/admin/category')
        }else{
            res.status(400).json({error:"Category Not found"})
        }
        
    } catch (error) {
        console.log("Error found in categoryManagement side: ", error.message);
        res.redirect("/admin/error");
    }
    
}

const softDeleteCategory = async (req, res) => {
    try {
        const id = req.params.id;

        // Update the category's `isListed` status to false
        const updateCategory = await Category.findByIdAndUpdate(id, { isListed: false }, { new: true });

        if (updateCategory) {
            res.status(200).json({ message: "Category soft deleted successfully." });
        } else {
            res.status(400).json({ error: "Category not found." });
        }
    } catch (error) {
        console.log("Error in soft deleting category: ", error.message);
        res.status(500).json({ error: "Internal server error." });
    }
};


module.exports = {
    categoryInfo,
    addCategory,
    getEditCategory,
    editCategory,
    softDeleteCategory
}