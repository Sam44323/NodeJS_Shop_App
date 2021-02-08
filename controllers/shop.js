const Product = require('../models/product');
const Order = require('../models/order');
const errorCreator = require('../errorObjectCreator/errorObj');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit'); // exposes a PDFDocument constructor

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
          ...order._doc,
          orderId: ++c,
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

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(errorCreator('No order found', 422));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(errorCreator('Unauthorized!'));
      }
      const invoiceName = `invoice-${orderId}.pdf`; // the invoice file with the the following orderId
      //creating the path for the destined file for reading it from the application

      const invoicePath = path.join('data', 'invoices', invoiceName);

      const pdfDoc = new PDFDocument();
      pdfDoc.pipe(fs.createWriteStream(invoicePath)); // creating a new pdf docuement chunk by chunk and storing it in the servers file system

      //as res is a writable stream so we can send data in pieces
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        'inline; filename="' + invoiceName + '"'
      );
      pdfDoc.pipe(res); // piping the same created pdf to the response

      //configuring the styling for the generated pdf using the package
      pdfDoc.fontSize(26).text('Your Order Invoice', {
        underline: true,
        align: 'center',
      });
      pdfDoc.fontSize(17); // the latter parts of the pdfs will have a font-size of 17
      pdfDoc.text('----------------------------------------------------');
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice = totalPrice + prod.quantity * prod.product.price;
        pdfDoc.text(
          `${prod.product.title} - $ ${prod.product.price} Quantity: ${prod.quantity}`
        );
      });
      pdfDoc.text('--------------------------');
      pdfDoc.fontSize(20).text(`Total Price: ${totalPrice}`);
      pdfDoc.end();
    })
    .catch((err) => next(err));
};
