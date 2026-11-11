// Removes keys that start with "$" or contain "." so request data cannot smuggle in MongoDB operators
const clean = (value) => {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === "object" && !(value instanceof Date) && !Buffer.isBuffer(value)) {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".")) continue;
      out[key] = clean(val);
    }
    return out;
  }
  return value;
};

export default function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === "object") req.body = clean(req.body);
  if (req.query && typeof req.query === "object") {
    // defineProperty works whether req.query is a plain property or a getter
    Object.defineProperty(req, "query", {
      value: clean(req.query), writable: true, configurable: true, enumerable: true,
    });
  }
  next();
}