import rateLimit from 'express-rate-limit';

export const commentLimiter = (req, res, next) => next();
// rateLimit({
//   windowMs: 1 * 60 * 1000, // 1 minute
//   limit: 5, // Limit each IP to 5 requests per windowMs
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   message: { error: 'Too many comments submitted from this IP, please try again after 1 minute.' }
// });

export const newsletterLimiter = (req, res, next) => next();
// rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   limit: 3, // Limit each IP to 3 requests per windowMs
//   standardHeaders: 'draft-7',
//   legacyHeaders: false,
//   message: { error: 'Too many subscription attempts from this IP, please try again after 15 minutes.' }
// });
