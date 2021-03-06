require ('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const { ExpressOIDC } = require('@okta/oidc-middleware');
const app = express();
const port = 3000;
const Sequelize = require('sequelize');
const epilogue = require('epilogue'), ForbiddenError = epilogue.Errors.ForbiddenError


app.use(session({
  secret: process.env.RANDOM_SECRET_WORD,
  resave: true,
  saveUninitialized: false
}));

const oidc  = new ExpressOIDC({
  issuer: `${process.env.OKTA_ORG_URL}/oauth2/default`,
  client_id: process.env.OKTA_CLIENT_ID,
  client_secret: process.env.OKTA_CLIENT_SECRET,
  redirect_uri: process.env.REDIRECT_URL,
  scope: 'openid profile',
  routes: {
    callback: {
        path: '/authorization-code/callback',
        defaultRedirect: '/admin'
    }
  }
});

app.use(oidc.router);

app.use(cors());
app.use(bodyParser.json());

app.get('/home', (req, res) => {
 res.send('<h1>Welcome!!</div><a href="/login">Login</a>');
});

app.get('/admin', oidc.ensureAuthenticated(), (req, res) =>{
 res.send('Admin page');
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/home');
});

app.get('/', (req, res) => {
  res.redirect('/home');
});

const database = new Sequelize({
  dialect: 'sqlite',
  storage: './db.sqlite',
  operatorsAliases: false
});

const Post = database.define('posts', {
  title: Sequelize.STRING,
  content: Sequelize.TEXT,
});

epilogue.initialize({ app, sequelize: database });

const PostResource = epilogue.resource({
  model: Post,
  endpoints: ['/posts', '/posts:id']
});

PostResource.all.auth(function (req, res, context) {
  return new Promise(function (resolve, reject) {
    if (!req.isAuthenticated()) {
      re.status(401).send({ message: "Unauthorized" });
      resolve(context.stop);
    } else {
      resolve(context.continue);
    }
  })
});

database.sync().then(() => {
  oidc.on('ready', () => {
    app.listen(port, () => console.log(`My Blog App listening on port ${port}!`))
  })
});

oidc.on('error', err => {
  console.log("oidc error: ", err);
});
