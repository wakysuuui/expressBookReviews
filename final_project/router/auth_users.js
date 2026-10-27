const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes } = require('node:crypto');
const books = require('./booksdb');
const users = require('./users');
const authenticated = express.Router();
const secret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
authenticated.post('/login', wrap(async (req,res) => {
  const input = users.credentials(req.body);
  if (!input || !await users.authenticate(input.username,input.password)) return res.status(401).json({ message:'Invalid username or password' });
  await new Promise((resolve,reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.authorization = { accessToken:jwt.sign({},secret,{ subject:input.username, expiresIn:'1h', algorithm:'HS256' }) };
  await new Promise((resolve,reject) => req.session.save(err => err ? reject(err) : resolve()));
  res.json({ message:'User successfully logged in', username:input.username });
}));
authenticated.use('/auth', (req,res,next) => {
  const token = req.session.authorization?.accessToken;
  if (!token) return res.status(401).json({ message:'Please log in first' });
  jwt.verify(token,secret,{ algorithms:['HS256'] },(err,payload) => {
    if (err) return res.status(401).json({ message:'Session expired or invalid' });
    req.username = payload.sub;
    next();
  });
});
authenticated.use('/auth/review/:isbn', (req,res,next) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({ message:'Book not found' });
  req.book = books[req.params.isbn];
  req.book.reviews = Object.assign(Object.create(null),req.book.reviews || {});
  next();
});
authenticated.put('/auth/review/:isbn', (req,res) => {
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 5000) return res.status(400).json({ message:'Review must contain 1-5000 characters' });
  const exists = Object.hasOwn(req.book.reviews,req.username);
  req.book.reviews[req.username] = review.trim();
  res.status(exists ? 200 : 201).json({ message:exists ? 'Review updated' : 'Review added', reviews:req.book.reviews });
});
authenticated.delete('/auth/review/:isbn', (req,res) => {
  if (!Object.hasOwn(req.book.reviews,req.username)) return res.status(404).json({ message:'You have no review for this book' });
  delete req.book.reviews[req.username];
  res.json({ message:'Review deleted', reviews:req.book.reviews });
});
authenticated.post('/logout', (req,res,next) => req.session.destroy(err => {
  if (err) return next(err);
  res.clearCookie('bookreview.sid').json({ message:'Logged out' });
}));
module.exports = { authenticated };
