const express = require('express');
const { check } = require('express-validator');

const router = express.Router();
const authControllers = require('../controllers/auth');

router.get('/login', authControllers.getLogin);

router.get('/signup', authControllers.getSignup);

router.get('/reset', authControllers.getReset);

router.post('/reset', authControllers.postReset);

router.get('/new-password', authControllers.getNewPassword);

router.post('/new-password', authControllers.postNewPassword);

router.post('/login', authControllers.postLogin);

router.post(
  '/signup',
  [
    check('email')
      .isEmail()
      .withMessage('Please enter a valid email!')
      .custom((value, { req }) => {
        if (value === 'test@test.com') {
          throw new Error('This email address is forbidden!');
        }
        return true; //if we succeed so that we don't throw uneccessary errors
      }),
  ],
  authControllers.postSignup
);

router.post('/logout', authControllers.postLogoutMethod);

module.exports = router;
