const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const cron = require("node-cron");

// Run every minute for testing
cron.schedule("* * * * *", async () => {
  try {
    const now = new Date();

    // Find all categories with expired offers
    const categories = await Category.find({
      offerEndDate: { $lte: now },
      categoryOffer: { $gt: 0 },
    });

    categories.forEach(async (category) => {
      const currentOffer = category.categoryOffer;

      // Reset category offer
      category.categoryOffer = 0;
      category.offerStartDate = null;
      category.offerEndDate = null;
      await category.save();

      // Reset sale prices for all products under this category
      const products = await Product.find({ category: category.name });
      products.forEach(async (product) => {
        product.combos.forEach((combo) => {
          combo.salePrice = Math.round(
            combo.salePrice / (1 - currentOffer / 100)
          );
        });
        await product.save();
      });

      console.log(`Offer for category "${category.name}" has been reset.`);
    });
  } catch (error) {
    console.error("Error in cron job:", error);
  }
});
