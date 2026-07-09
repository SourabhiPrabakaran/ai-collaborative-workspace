import jwt from 'jsonwebtoken';
import { COOKIE_OPTIONS } from '../constants/index.js';

/**
 * Generate JWT token and set it in an HTTP-only cookie
 * @param {Object} res - Express response object
 * @param {string} userId - User identifier
 * @returns {string} token
 */
export const generateToken = (res, userId) => {
  const secret = process.env.JWT_SECRET || 'default_local_dev_secret_key_change_before_deployment';
  const token = jwt.sign({ userId }, secret, {
    expiresIn: '7d'
  });

  res.cookie('token', token, COOKIE_OPTIONS);
  return token;
};

/**
 * Clear JWT token cookie on logout
 * @param {Object} res - Express response object
 */
export const clearToken = (res) => {
  res.clearCookie('token', {
    ...COOKIE_OPTIONS,
    maxAge: 0 // instantly expires the cookie
  });
};
