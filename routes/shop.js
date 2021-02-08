const path = require('path');

const express = require('express');

const shopController = require('../controllers/shop');
const authMiddleware = require('../middleware/is_auth');

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', authMiddleware, shopController.getProduct);

router.get('/cart', authMiddleware, shopController.getCart);

router.post('/cart', authMiddleware, shopController.postCart);

router.post(
  '/cart-delete-item',
  authMiddleware,
  shopController.postCartDeleteProduct
);

router.post('/create-order', authMiddleware, shopController.postOrder);

router.get('/orders', authMiddleware, shopController.getOrders);

router.get(
  '/orders-invoice/:orderId',
  authMiddleware,
  shopController.getInvoice
);

module.exports = router;
