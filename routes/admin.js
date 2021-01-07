const path = require('path');

const express = require('express');

const adminController = require('../controllers/admin');
const authMiddleware = require('../middleware/is_auth');

const router = express.Router();

/*
Note:-
------------
You can pass as many methods as you want in a method and the requets will pass from left to right i.e. for example
from authMiddleware to adminController.getAddProduct
*/

// /admin/add-product => GET
router.get('/add-product', authMiddleware, adminController.getAddProduct);

// /admin/products => GET
router.get('/products', authMiddleware, adminController.getProducts);

// /admin/add-product => POST
router.post('/add-product', authMiddleware, adminController.postAddProduct);

router.get(
  '/edit-product/:productId',
  authMiddleware,
  adminController.getEditProduct
);

router.post('/edit-product', authMiddleware, adminController.postEditProduct);

router.post(
  '/delete-product',
  authMiddleware,
  adminController.postDeleteProduct
);

module.exports = router;
