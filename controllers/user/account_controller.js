const User = require("../../models/userSchema");
const Brand = require("../../models/brandSchema");
const Address = require("../../models/addressSchema");

const load_page404 = async (req, res) => {
  try {
    res.status(404).render("user/page404");
  } catch (error) {
    res.redirect("/page404");
  }
};

const loadAccountPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.session.user;
    const userData = user ? await User.findById(user).lean() : null;

    if (userData) {
      const userAddress = await Address.findOne({ userId: user }).lean();
      userData.address = userAddress ? userAddress.address : [];
    }

    res.status(200).render("user/account", {
      brand: brand,
      user: userData,
    });
  } catch (error) {
    res.redirect("/page404");
  }
};

const loadAddressPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    const user = req.session.user;

    let userData = null;

    if (user) {
      // Fetch user data
      userData = await User.findById(user).lean();

      // Fetch address details
      const userAddress = await Address.findOne({ userId: user }).lean();

      // Add address details to userData
      if (userAddress && userAddress.address.length > 0) {
        userData.address = userAddress.address; // Detailed address objects
      } else {
        userData.address = []; // Empty array if no addresses exist
      }
    }

    console.log(
      "Final User Data Passed to View:",
      JSON.stringify(userData, null, 2)
    );

    res.render("user/address", {
      brand: brand,
      user: userData, // Pass updated userData with detailed address
    });
  } catch (error) {
    console.error("Error loading address page:", error);
    res.redirect("/page404");
  }
};

const loadAddAddressPage = async (req, res) => {
  try {
    const brand = await Brand.find({});
    res.render("user/add-address", {
      brand: brand,
      user: req.session.user,
    });
  } catch (error) {
    res.redirect("/page404");
  }
};

const addNewAddress = async (req, res) => {
  try {
    const {
      addressType,
      houseName,
      city,
      landMark,
      state,
      pincode,
      phone,
      altPhone,
    } = req.body;
    const userId = req.session.user;

    const userAddress = await Address.findOne({ userId });

    if (userAddress) {
      // If address already exists, update it
      userAddress.address.push({
        addressType,
        houseName,
        city,
        landMark,
        state,
        pincode,
        phone,
        altPhone,
      });
      await userAddress.save();
    } else {
      // If no address exists, create a new one
      const newAddress = new Address({
        userId,
        address: [
          {
            addressType,
            houseName,
            city,
            landMark,
            state,
            pincode,
            phone,
            altPhone,
          },
        ],
      });
      await newAddress.save();
    }

    res.redirect("/addresses");
  } catch (error) {
    console.error("Error adding new address:", error);
    res.redirect("/page404");
  }
};

module.exports = {
  load_page404,
  loadAccountPage,
  loadAddressPage,
  loadAddAddressPage,
  addNewAddress,
};