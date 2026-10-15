import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'audit.jsonl');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ─── PII Masking ────────────────────────────────────────────────────────────
// Redacts common PII patterns before writing to log files.

const PII_PATTERNS = [
  // Email addresses: alice.johnson@example.com → a***@example.com
  {
    regex: /\b([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g,
    replace: (_, first, _rest, domain) => `${first}***@${domain}`,
  },
  // Phone numbers (US formats): (123) 456-7890, 123-456-7890, +1234567890
  {
    regex: /(\+?1?\s*[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})\b/g,
    replace: '[REDACTED_PHONE]',
  },
  // Credit card patterns: 4 groups of 4 digits
  {
    regex: /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/g,
    replace: '[REDACTED_CARD]',
  },
  // Street addresses: number + street name + common suffixes
  {
    regex: /\b\d{1,5}\s+[A-Za-z]+\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Boulevard|Blvd|Way|Circle|Terrace|Trail)\b[^,\n]*/gi,
    replace: '[REDACTED_ADDRESS]',
  },
];

/**
 * Masks PII in a string value.
 * @param {string} str - The string to mask
 * @returns {string} - The masked string
 */
export const maskPII = (str) => {
  if (typeof str !== 'string') return str;
  let masked = str;
  for (const { regex, replace } of PII_PATTERNS) {
    masked = masked.replace(regex, replace);
  }
  return masked;
};

/**
 * Recursively masks PII in an object (for structured log entries).
 * @param {*} obj - The value to mask (string, object, array, or primitive)
 * @returns {*} - The masked value
 */
const maskPIIDeep = (obj) => {
  if (typeof obj === 'string') return maskPII(obj);
  if (Array.isArray(obj)) return obj.map(maskPIIDeep);
  if (obj && typeof obj === 'object') {
    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
      masked[key] = maskPIIDeep(value);
    }
    return masked;
  }
  return obj;
};

/**
 * Writes a structured JSON log entry to the audit log file.
 * All string values are PII-masked before writing.
 *
 * @param {object} entry - The log entry (will be augmented with timestamp)
 */
export const writeAuditLog = (entry) => {
  const logEntry = maskPIIDeep({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  const line = JSON.stringify(logEntry) + '\n';

  // Append asynchronously — fire-and-forget, logging should never block the response
  fs.appendFile(LOG_FILE, line, (err) => {
    if (err) console.error('Failed to write audit log:', err.message);
  });
};

export default { writeAuditLog, maskPII };
