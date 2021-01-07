const bcrypt = require('bcryptjs');

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
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password)
        .then((matchValue) => {
          if (matchValue) {
            req.session.isLoggedIn = true; //setting up a new session for the request
            req.session.user = user._id; // storing the user id in the session
            return req.session.save((err) => {
              console.log(err);
              res.redirect('/');
            }); //returning so that we don't go to the next step of redirecting to the /login page
          }
          res.redirect('/login');
        })
        .catch((err) => {
          console.log(err);
          res.redirect('login');
        });

      /*
      Now after this request is over, we don't lose the user data because the sessions stays intact and
      the session data is shared across multiple requests from the same user
      */
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({ email: email }).then((user) => {
    if (user) {
      return res.redirect('/signup');
    }
    bcrypt
      .hash(password, 12)
      .then((hashedPassword) => {
        const newUser = new User({
          email: email,
          password: hashedPassword,
          cart: { items: [] },
        });
        return newUser.save();
      })
      .then((result) => {
        res.redirect('/login');
      })
      .catch((err) => {
        console.log(err);
      }); //returns a promise for the new password
  });
};

exports.postLogoutMethod = (req, res) => {
  //using the destroy() method for destroying the session data
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  });
};
