const bcrypt = require('bcryptjs');
const nodemialer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');

const User = require('../models/user');

/*
transporter is the setup that tells nodemailer as how the mails should be sent

sendgridTransport() rturns a configuration that will be used by createTransport
*/

const transporter = nodemialer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        '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',
    },
  })
);

exports.getLogin = (req, res) => {
  const errMessage = req.flash('error')[0]; // as flash is an array of elements so we extract the message using the indexing
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: errMessage,
  });
};

exports.getSignup = (req, res, next) => {
  const message = req.flash('exists')[0];
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    message: message,
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
        req.flash('error', 'Invalid email or password.'); // adding a temporary error field in the session
        return res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password) // comparing the stored password with the entered password
        .then((matchValue) => {
          if (matchValue) {
            req.session.isLoggedIn = true; //setting up a new session for the user
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
  /*
  after signing up we redirect to th login page for creating a new session with the newly created user
  */
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({ email: email }).then((user) => {
    if (user) {
      //if an user already exist with the mentioned email
      req.flash('exists', 'The given email already exists with an account');
      return res.redirect('/signup');
    }
  });
  //returns a promise for the new password as hashing a value can take some-time
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const newUser = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] },
      });
      return newUser.save(); // returning a new promise to be handled in the next then block
    })
    .then((result) => {
      res.redirect('/login'); // we will send the mail after redirecting to the login page
      return transporter
        .sendMail({
          to: email,
          from: 'samhenrick7@gmail.com', // mail regiestered in sendgrid account
          subject: 'Signup Succeded!',
          html: '<h1>You account was successfully created!</h1>',
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postLogoutMethod = (req, res) => {
  //using the destroy() method for destroying the session data
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  });
};
