

// if not it will redirect to the login page.
const is_AdminLogin = async (req, res, next) => {
    try {
        if (req.session.admin) {
            next();
        } else {
            res.redirect('/admin/login');
        }
    } catch (error) {
        console.log(error.message);
    }
}

//if exists it will redirect to the home page.
const is_AdminLogout = async (req, res, next) => {
    try {
        if (req.session.admin) {
            res.redirect('/admin/dashboard');
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