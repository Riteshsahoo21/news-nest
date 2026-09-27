import crypto from 'crypto';

const safeEquals = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const verifyAutomationKey = (req, res, next) => {
  const expectedKey = String(process.env.N8N_AUTOMATION_KEY || '').trim();
  if (expectedKey.length < 24) {
    return res.status(503).json({
      error: 'Automation API is disabled. Configure N8N_AUTOMATION_KEY with at least 24 characters.'
    });
  }

  const providedKey = String(req.get('x-automation-key') || '').trim();
  if (!safeEquals(providedKey, expectedKey)) {
    return res.status(401).json({ error: 'Invalid automation key.' });
  }

  next();
};

