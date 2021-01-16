const crypto = require('crypto'); //using the crypto library for creating a token

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
  const message = req.flash('error')[0];
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
          req.flash('error', 'Invalid email or password');
          res.redirect('/login');
        })
        .catch((err) => {
          console.log(err);
          res.redirect('/login');
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
      req.flash('error', 'The given email already exist with an account');
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
      res.redirect('/login');
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
    res.redirect('/login');
  });
};

exports.getReset = (req, res) => {
  let errMessage = req.flash('error')[0];
  if (req.flash('error').length == 0) {
    errMessage = '';
  }
  res.render('auth/resetPassword', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: errMessage,
  });
};

exports.postReset = (req, res) => {
  //using a token based authentication for resetting the password of the user
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      res.redirect('/reset');
    }
    const token = buffer.toString('hex'); // creating a token from the buffer
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash('error', 'No account with that email is found!');
          res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        //sending the email with the token created for resetting the password to the user
        res.redirect('/login');
        transporter.sendMail({
          to: req.body.email,
          from: 'samhenrick7@gmail.com', // mail regiestered in sendgrid account
          subject: 'Passoword Reset Request!',
          html: `
            <p>You requested a passowrd reset!</p>
            <p>Click this <a href="http://localhost:3000/new-password/?token=${token}">link</a> to set up a new password</p>
            `,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res) => {
  const token = req.query.token; // extracting the token from the url

  let errMessage = req.flash('error')[0];
  if (req.flash('error').length == 0) {
    errMessage = '';
  }
  res.render('auth/new-password', {
    path: '/new-password',
    pageTitle: 'New Password',
    errorMessage: errMessage,
    tokenValue: token,
  });
};

exports.postNewPassword = (req, res) => {
  const tokenValue = req.body.tokenValue;
  //find the user with the matching token value that is still valid for working
  User.findOne({
    resetToken: tokenValue,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((userValue) => {
      if (!userValue) {
        req.flash('error', 'No user is present!');
        res.redirect('/reset');
      }
      bcrypt
        .hash(req.body.password, 12)
        .then((hashedPassword) => {
          userValue.password = hashedPassword;
          return userValue.save(); // returning a new promise to be handled in the next then block
        })
        .then((result) => {
          res.redirect('/login');
          return transporter.sendMail({
            to: userValue.email,
            from: 'samhenrick7@gmail.com', // mail regiestered in sendgrid account
            subject: 'Password Reset',
            html: '<h1>You password was successfully changed!</h1>',
          });
        })
        .catch((err) => {
          console.log(err);
        });
    })
    .catch((err) => {
      console.log(err);
    });
};
