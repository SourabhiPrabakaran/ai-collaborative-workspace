import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Try to read token from cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback to Authorization Header (Bearer token)
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized: no session token found'));
  }

  try {
    const secret = process.env.JWT_SECRET || 'default_local_dev_secret_key_change_before_deployment';
    const decoded = jwt.verify(token, secret);

    // Retrieve user and attach to request context (excluding password)
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(401);
      return next(new Error('Not authorized: user no longer exists'));
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    return next(new Error('Not authorized: invalid token signature or expired'));
  }
};
