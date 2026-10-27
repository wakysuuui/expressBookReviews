const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false }));
app.use('/customer', session({
  name: 'bookreview.sid',
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 3600000 }
}));
app.use('/customer', require('./router/auth_users').authenticated);
app.use('/', require('./router/general').general);
app.use((req,res) => res.status(404).json({ message: 'Route not found' }));
app.use((err,req,res,next) => {
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});
if (require.main === module) app.listen(Number(process.env.PORT || 5000), '127.0.0.1', () => console.log('Book API ready'));
module.exports = app;
