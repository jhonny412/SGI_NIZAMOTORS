const SALT = "SGI_NIZA_MOTORS_SALT_2026";

/**
 * Computes a SHA-256 salted hash of a PIN string.
 * Works synchronously across Browser and Node environments.
 * @param {string|number} pin 
 * @returns {string} 64-character hex hash string
 */
export function hashPin(pin) {
  if (pin === null || pin === undefined || pin === "") return "";
  const str = String(pin).trim();
  // If already a 64-char SHA256 hex string, return as is
  if (/^[a-f0-9]{64}$/i.test(str)) return str;

  const text = str + SALT;
  return sha256Sync(text);
}

/**
 * Fast synchronous SHA-256 implementation.
 */
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i, j;
  let result = "";

  const words = [];
  const asciiLength = ascii[lengthProperty] * 8;

  let hash = (sha256Sync.h = sha256Sync.h || []);
  let k = (sha256Sync.k = sha256Sync.k || []);
  let primeCounter = k[lengthProperty];

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += "\x80";
  while ((ascii[lengthProperty] % 64) - 56) ascii += "\x00";

  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return "";
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }

  words[words[lengthProperty]] = (asciiLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiLength | 0;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;

    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

/**
 * Generates an authentication session token for API headers.
 * @param {Object} user 
 * @returns {string} Bearer token
 */
export function generateSessionToken(user) {
  if (!user) return "";
  const payload = {
    id: user.id,
    nombre: user.nombre,
    rol: user.rol,
    ts: Date.now()
  };
  const str = JSON.stringify(payload);
  const base64 = typeof btoa === "function" ? btoa(str) : Buffer.from(str).toString("base64");
  const signature = hashPin(str);
  return `sgi.${base64}.${signature.slice(0, 16)}`;
}

/**
 * Gets active session token from sessionStorage.
 * @returns {string}
 */
export function getActiveToken() {
  if (typeof sessionStorage !== "undefined") {
    const token = sessionStorage.getItem("sgi-auth-token");
    if (token) return token;
  }
  return "";
}
