const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const derive = require('node:util').promisify(scrypt);
const users = new Map();
function credentials(body = {}) {
  const { username, password } = body;
  if (typeof username !== 'string' || !/^[A-Za-z0-9_-]{3,40}$/.test(username) ||
      typeof password !== 'string' || password.length < 8 || password.length > 128) return null;
  return { username, password };
}
async function register(username, password) {
  if (users.has(username)) return false;
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt, 64);
  if (users.has(username)) return false;
  users.set(username, { salt, hash });
  return true;
}
async function authenticate(username, password) {
  const user = users.get(username);
  if (!user) return false;
  return timingSafeEqual(user.hash, await derive(password, user.salt, 64));
}
module.exports = { credentials, register, authenticate };
