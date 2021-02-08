const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const mongoConstants = require('./constants');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session); // for storing the sessions in the mongodb database
const csrf = require('csurf'); // for csrf protection
const flash = require('connect-flash'); // for storing a temporary messages in the session
const multer = require('multer'); // for parsing the data with files

const errorController = require('./controllers/error');
const User = require('./models/user');
const errorCreator = require('./errorObjectCreator/errorObj');

const app = express();
const store = new MongoDBStore({
  uri: mongoConstants.MONGO_URI, // to which database it should create a store for storing the sessions
  collection: 'sessions', // the collection in which the sessions will be store in the database
});

app.set('view engine', 'ejs'); // setting the templating engine for parsing the templates
app.set('views', 'views'); // the engine will find all the templates in the views folder

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const csrfProtection = csrf();

const fileStorageConfigValue = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname); // setting the file name
  },
});

//for filtering out invalid files i.e. files other than png, jpg or jpeg

const fileFilterObject = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

/*
Why we are creating a new User object when we are getting the user as the response(when use native MongoDB driver)?

This is because, when we get user data but not any methods associated with the user object. So to avail the methods,
such as adding to the cart or deleting from the cart we are creating a new copy of of the recieved user and thus,
whenever we are doing any tasks on the user, we save the data to the database

-------------------------------------------------------------------------------------

When using mongoose we don't create any object of the recieved user because mongoose parses it as an object of
the model with all the specified methods defined for that object and thus we can carry out diff methods on
the recieved user without explicity creating a new object based on that user
*/

/*
Note:-
----------------------------------

Whenever we send a request, then it first goes through middleware of getting the user and storing the user(later will be replaced by the authentication method for multiple user availability)

mongoose behind the scene applies all the database methods for crud operations of the documents
on the collections in the database

------------------------------------------------------------------------
*/

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({
    storage: fileStorageConfigValue,
    fileFilter: fileFilterObject,
  }).single('image')
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
//setting up the session middleware
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
//using csurf after creating the sessions as because it will store the tokens in the session

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

/*
Why we are storing the user data in the request even after using sessions?
-------------------------------------------------------------------------------
This is because when we initially store the user data with the mongoose data in the session then it stores
the data with all the mongoose models and till this point it's fine. But when we again fetch the user data
from the session, then we don't fetch the data using the mongoose methods but the MongoDBStore fetches the data
and as we know from previous experience with the native MongoDB driver code, that it doesn't fetch any methods
associated with the data object and thus we only can read the data but cannot perform any actions on it.
So to solve this problem, when a new session is created for an user, we just store the id of that user and
for every subsequent request made by that user, we always create a new instance based on the user id with all
the datas we have from the database so that we can perform any actions, such as adding to cart for that user.
Thus we can do all the tasks we did previously on that user
*/

app.use((req, res, next) => {
  //storing the mongoose user object of the user data that is stored in the session for that user
  User.findById(req.session.user)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      return next(errorCreator(err));
    });
});

/*
locals helps you to set the following local fields to all the responses from all the rendered requests

We put csrf tokens in the views where we do the POST request as we only change datas with the POST but not with
GET
*/

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/error/500', errorController.get500);

app.use(errorController.get404);

//example of creating an error handling middleware

app.use((error, req, res, next) => {
  res.redirect('/error/500');
});

//after we get a connection to the database then we will start the dev server
//using mongoose for connecting to the MongoDB database

mongoose
  .connect(mongoConstants.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Connected to the database!');
    app.listen(3000, () => {
      console.log('Connected to the server!');
    });
  })
  .catch((err) => {
    console.log(err);
  });
