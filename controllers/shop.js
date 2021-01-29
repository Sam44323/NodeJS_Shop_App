const Product = require('../models/product');
const Order = require('../models/order');
const errorCreator = require('../errorObjectCreator/errorObj');

/*
We can use methods such as findByIdAndDelete and etc only on the models(accordingly) itself but not on the instances created on it.
*/

exports.getProducts = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render('shop/product-list', {
        prods: products,
        pageTitle: 'All Products',
        path: '/products',
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.getIndex = (req, res, next) => {
  Product.find()
    .then((products) => {
      res.render('shop/index', {
        prods: products,
        pageTitle: 'Shop',
        path: '/',
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: req.user.cart.items, // getting the cartItems from the user stores in the session
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.postCart = (req, res, next) => {
  Product.findById(req.body.productId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then(() => {
      res.redirect('/cart');
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  req.user
    .removeFromCart(req.body.productId)
    .then(() => {
      res.redirect('/cart');
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then(() => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect('/orders');
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.getOrders = (req, res, next) => {
  let c = 0;
  Order.find({ 'user.userId': req.user._id })
    .then((orders) => {
      const ordersArray = orders.map((order) => {
        return {
          orderId: ++c,
          products: [...order.products],
        };
      });
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        ordersArray: ordersArray,
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};
