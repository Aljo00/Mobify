const Category = require("../models/categorySchema");
const Product = require("../models/productSchema");

const resetCategoryOffer = async () => {
  try {
    const now = new Date();
    const categories = await Category.find({
      offerEndDate: { $lte: now },
      categoryOffer: { $gt: 0 },
    });

    console.log("Categories fetched:", categories);

    for (const category of categories) {
      try {
        const currentOffer = category.categoryOffer;

        // Reset category offer
        category.categoryOffer = 0;
        category.offerStartDate = null;
        category.offerEndDate = null;
        await category.save();
        console.log(`Category "${category.name}" offer reset.`);

        // Reset sale prices for all products under this category
        const products = await Product.find({ category: category.name });
        for (const product of products) {
          product.combos.forEach((combo) => {
            combo.salePrice = Math.round(
              combo.salePrice / (1 - currentOffer / 100)
            );
          });
          await product.save();
          console.log(`Updated product: ${product.productName}`);
        }
      } catch (err) {
        console.error(`Error processing category "${category.name}":`, err);
      }
    }
  } catch (error) {
    console.error("Error in cron job:", error);
  }
};

module.exports = resetCategoryOffer;
