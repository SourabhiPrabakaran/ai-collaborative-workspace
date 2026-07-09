/**
 * Validate Signup inputs
 * @param {Object} data - Signup fields
 * @returns {Object} { isValid, errors }
 */
export const validateSignupInput = (data) => {
  const errors = {};
  const { email, password, fullName } = data;

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please provide a valid email address';
    }
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    errors.fullName = 'Full name is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};

/**
 * Validate Login inputs
 * @param {Object} data - Login fields
 * @returns {Object} { isValid, errors }
 */
export const validateLoginInput = (data) => {
  const errors = {};
  const { email, password } = data;

  if (!email || typeof email !== 'string' || !email.trim()) {
    errors.email = 'Email address is required';
  }

  if (!password || typeof password !== 'string') {
    errors.password = 'Password is required';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0
  };
};
