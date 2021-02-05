const Product = require('../models/product');
const { validationResult } = require('express-validator');
const { errorCreator } = require('../errorObjectCreator/errorObj');

/*
We can use methods such as findByIdAndDelete and etc only on the models itself but not on the instances created.
*/

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    errorMessage: '',
    product: {},
    validationError: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMessage: errors.array()[0].msg,
      product: {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        price: req.body.price,
      },
      validationError: errors.array(),
    });
  }

  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  console.log(image);
  const description = req.body.description;
  const product = new Product({
    title: title,
    price: price,
    description: description,
    image: image,
    userId: req.user._id,
  });
  product
    .save()
    .then(() => {
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
      //When we call next with an error passed as an argument, then we let express know that an error occured and it will skip all other middlewares and move right away to a error handling middleware(defined by us)
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        errorMessage: '',
        validationError: [],
      });
    })
    .catch((err) => {
      return next(errorCreator('Cant find the product', 500));
    });
};

exports.postEditProduct = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      errorMessage: errors.array()[0].msg,
      product: {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        price: req.body.price,
        _id: req.body.productId,
      },
      validationError: errors.array(),
    });
  }

  Product.findById(req.body.productId)
    .then((product) => {
      product.title = req.body.title;
      product.price = req.body.price;
      product.description = req.body.description;
      product.imageUrl = req.body.imageUrl;
      return product.save();
    })
    .then(() => {
      console.log('UPDATED PRODUCT!');
      res.redirect('/admin/products');
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({ userId: req.user._id })
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then((products) => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
      });
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const userId = req.user._id.toString();
  Product.findById(prodId)
    .then((product) => {
      if (product.userId.toString() === userId) {
        //product will only be deleted by the user who created it
        return Product.findByIdAndRemove(prodId, {
          useFindAndModify: false,
        }).then(() => {
          console.log('DESTROYED PRODUCT');
          res.redirect('/admin/products');
        });
      }
      res.redirect('/admin/products');
    })
    .catch((err) => {
      return next(errorCreator(err, 500));
    });
};
