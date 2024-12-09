

// if not it will redirect to the login page.
const is_AdminLogin = async (req, res, next) => {
    try {
        if (req.session.user) {
            next();
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
    }
}

//if exists it will redirect to the home page.
const is_AdminLogout = async (req, res, next) => {
    try {
        if (req.session.user) {
            res.redirect('/');
        } else {
            next();
        }
    } catch (error) {
        console.log(error.message);
    }
}

module.exports ={
    is_AdminLogin,
    is_AdminLogout
}