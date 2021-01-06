const User = require('../models/user');

/*
Why do we need sessions?
-----------------------------
The main concept of using sessions is storing some data temporarily in that sessions before we move it
to any database(you can also do auth and other stuffs which doesn't require database access).

For eg:-
-------------
Suppose you went to an e-commerce website and you started adding cart without creating an account on that
site. So we can take take this approach for anonymous users that, if they starts adding items to the cart
without creating an account on the site, then we initially store the cart data in sessions and once he applies
for the checkout(for which they obviously have to create an account so that we can get their details) we
transfer that cookie data into the database by creating a new user object for him and thus proceeding
with their orders. 
*/

exports.getLogin = (req, res) => {
  let cookieValue = req.get('Cookie'); // getting the cookie value from the header
  if (cookieValue) {
    cookieValue = cookieValue.split('=')[1];
  } else {
    cookieValue = false;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: cookieValue,
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
  });
};

exports.postLogin = (req, res) => {
  //this sessions will inturn create a new cookie with the value true(encrypted)
  // Fetching a user only when we login, unlike what we did previously of storing the data of the user initially
  // in the app.js file

  User.findById('5feb585e02be05351880f1de')
    .then((user) => {
      req.session.isLoggedIn = true; //setting up a new session for the request
      req.session.user = user._id; // storing the user id in the session
      req.session.save((err) => {
        console.log(err);
        res.redirect('/');
      }); //only redirect to the / route after the session is created in the database

      /*
      Now after this request is over, we don't lose the user data because the sessions stays intact and
      the session data is shared across multiple requests from the same user
      */
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {};

exports.postLogoutMethod = (req, res) => {
  //using the destroy() method for destroying the session data
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  });
};
