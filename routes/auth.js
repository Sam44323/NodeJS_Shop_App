const express = require('express');
const { check } = require('express-validator');

const router = express.Router();
const authControllers = require('../controllers/auth');
const User = require('../models/user');

router.get('/login', authControllers.getLogin);

router.get('/signup', authControllers.getSignup);

router.get('/reset', authControllers.getReset);

router.post('/reset', authControllers.postReset);

router.get('/new-password', authControllers.getNewPassword);

router.post('/new-password', authControllers.postNewPassword);

router.post(
  '/login',
  [
    check('email', 'Please enter a valid email!').normalizeEmail().isEmail(),
    check('password', 'Please enter a valid password!')
      .trim()
      .not()
      .isEmpty()
      .isLength({ min: 5 }),
  ],
  authControllers.postLogin
);

router.post(
  '/signup',
  [
    check('email', 'Please enter a valid email!')
      .normalizeEmail()
      .isEmail()
      .custom((value, { req }) => {
        //example of doing async validation
        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject(
              'The given email already exist with an account'
            );
          }
        });
      }),
    check(
      'password',
      'Please enter a alphanumeric password of atleast 5 characters' // you can use this method, if you want a default error message for the all the validators
    )
      .trim()
      .isLength({ min: 5 })
      .isAlphanumeric(),
    check('confirmPassword')
      .trim()
      .custom((value, { req }) => {
        //checking the equality of confPass with pass
        if (value !== req.body.password) {
          throw new Error(
            'Your confirmation password should match with the entered password!'
          );
        }
        return true;
      }),
  ],
  authControllers.postSignup
);

router.post('/logout', authControllers.postLogoutMethod);

module.exports = router;
