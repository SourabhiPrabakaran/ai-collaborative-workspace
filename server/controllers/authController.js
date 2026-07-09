import User from '../models/User.js';
import { generateToken, clearToken } from '../utils/jwt.js';
import { validateSignupInput, validateLoginInput } from '../validators/authValidator.js';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
export const registerUser = async (req, res, next) => {
  try {
    const { errors, isValid } = validateSignupInput(req.body);

    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { email, password, fullName } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      return next(new Error('User already exists with this email address'));
    }

    // Create user. The pre-save hook in User schema will handle hashing the password
    const user = await User.create({
      email,
      passwordHash: password,
      fullName
    });

    if (user) {
      // Generate token and set HTTP-only cookie
      generateToken(res, user._id);

      res.status(201).json({
        success: true,
        data: {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt
        }
      });
    } else {
      res.status(400);
      return next(new Error('Invalid user data provided'));
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token (Login)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res, next) => {
  try {
    const { errors, isValid } = validateLoginInput(req.body);

    if (!isValid) {
      res.status(400);
      return next(new Error(Object.values(errors)[0]));
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      res.status(401);
      return next(new Error('Invalid email or password'));
    }

    // Generate token and set HTTP-only cookie
    generateToken(res, user._id);

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user / clear cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logoutUser = async (req, res, next) => {
  try {
    clearToken(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: req.user
    });
  } catch (error) {
    next(error);
  }
};
