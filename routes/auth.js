const express = require('express');

const router = express.Router();
const authControllers = require('../controllers/auth');

router.get('/login', authControllers.getLogin);

router.get('/signup', authControllers.getSignup);

router.post('/login', authControllers.postLogin);

router.post('/signup', authControllers.postSignup);

router.post('/logout', authControllers.postLogoutMethod);

module.exports = router;
