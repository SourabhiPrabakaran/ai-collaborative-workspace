/**
 * Middleware to sanitize user inputs and prevent MongoDB NoSQL Injection attacks.
 * Recursively deletes any keys starting with '$' from req.body, req.query, and req.params.
 */
export const sanitizeQuery = (req, res, next) => {
  const clean = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$')) {
          delete obj[key];
        } else {
          clean(obj[key]);
        }
      }
    }
  };

  clean(req.body);
  clean(req.query);
  clean(req.params);
  
  next();
};
