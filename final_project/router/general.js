const express = require('express');
const axios = require('axios');
const books = require('./booksdb');
const users = require('./users');
const general = express.Router();
const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);
general.get('/', (req,res) => res.json(books));
general.get('/isbn/:isbn', (req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({ message:'Book not found' });
  res.json(books[req.params.isbn]);
});
for (const field of ['author','title']) {
  general.get('/'+field+'/:value', (req,res) => {
    const value = req.params.value.trim().toLowerCase();
    res.json(Object.fromEntries(Object.entries(books).filter(([,book]) =>
      String(book[field]).toLowerCase().includes(value))));
  });
}
general.get('/review/:isbn', (req,res) => {
  if (!Object.hasOwn(books,req.params.isbn)) return res.status(404).json({ message:'Book not found' });
  res.json(books[req.params.isbn].reviews || {});
});
general.post('/register', wrap(async (req,res) => {
  const input = users.credentials(req.body);
  if (!input) return res.status(400).json({ message:'Use a 3-40 character username and an 8-128 character password' });
  if (!await users.register(input.username,input.password)) return res.status(409).json({ message:'Username already exists' });
  res.status(201).json({ message:'User successfully registered', username:input.username });
}));
// Four asynchronous Axios HTTP client methods for the final project.
function client(baseURL) {
  return axios.create({ baseURL:baseURL || process.env.BOOK_API_URL || 'http://127.0.0.1:5000', timeout:10000, proxy:false });
}
async function getAllBooks(baseURL) {
  try { return (await client(baseURL).get('/')).data; } catch (error) { throw new Error('Unable to retrieve books: '+error.message, { cause:error }); }
}
async function getBooksByISBN(isbn,baseURL) {
  try { return (await client(baseURL).get('/isbn/'+encodeURIComponent(isbn))).data; } catch (error) { if (error.response?.status === 404) return { message:'Book not found' }; throw new Error('Unable to retrieve books by isbn: '+error.message, { cause:error }); }
}
async function getBooksByAuthor(author,baseURL) {
  try { return (await client(baseURL).get('/author/'+encodeURIComponent(author))).data; } catch (error) { if (error.response?.status === 404) return { message:'Book not found' }; throw new Error('Unable to retrieve books by author: '+error.message, { cause:error }); }
}
async function getBooksByTitle(title,baseURL) {
  try { return (await client(baseURL).get('/title/'+encodeURIComponent(title))).data; } catch (error) { if (error.response?.status === 404) return { message:'Book not found' }; throw new Error('Unable to retrieve books by title: '+error.message, { cause:error }); }
}
module.exports = { general,getAllBooks,getBooksByISBN,getBooksByAuthor,getBooksByTitle };

