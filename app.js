const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session); // for storing the sessions in the mongodb database
const csrf = require('csurf');
const flash = require('connect-flash');

const errorController = require('./controllers/error');
const User = require('./models/user');

const MONGODB_URI =
  'mongodb+srv://admin-suranjan:admin-suranjan@cluster0.hzfia.mongodb.net/shop?retryWrites=true&w=majority';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI, // to which database it should create a store for storing the sessions
  collection: 'sessions', // the collection in which the sessions will be store in the database
});

app.set('view engine', 'ejs'); // setting the templating engine for parsing the templates
app.set('views', 'views'); // the engine will find all the templates in the views folder

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const csrfProtection = csrf();

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
Definitions of all the configurations in the for the sessions:-
---------------------------------------------------------------
secret:-
----------
This is the secret used to sign the session ID cookie. This can be either a string for a single secret,
or an array of multiple secrets. If an array of secrets is provided, only the first element will be
used to sign the session ID cookie, while all the elements will be considered when verifying the
signature in requests
-------------------------------------------

resave:-
--------------
Forces the session to be saved back to the session store,
even if the session was never modified during the request
------------------------------------------------------------
saveUninitialized:-
----------------------
Forces a session that is "uninitialized" to be saved to the store.
A session is uninitialized when it is new but not modified
*/

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

//setting up the session middleware
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
//using csurf after creatingt the sessions as because it will store the tokens in the session

app.use(csrfProtection);
app.use(flash());

/*
Why we are storing the user data in the request even after using sessions?
-------------------------------------------------------------------------------
This is because when we initially store the user data with the mongoose data in the session then it stores
the data with all the mongoose models and till this point it's fine. But when we again fetch the user data
from the session, then we don't fetch the data using the mongoose methods but the MongoDBStore fetches the data
and as we know from the previous experience with the native MongoDB driver code, that it doesn't fetch any methods
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
      req.user = user;
      next();
    })
    .catch((err) => {
      console.log(err);
    });
});

/*
locals helps you to set the following local fields to all the rendered views from all the rendered requests

We put csrf tokens in the views where we do the POST request as we only change datas with the POST but not with
GET
*/

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);
//after we get a connection to the database then we will start the dev server

//using mongoose for connecting to the MongoDB database

mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    console.log('Connected to the database!');
    app.listen(3000);
  })
  .catch((err) => {
    console.log(err);
  });
