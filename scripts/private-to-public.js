const {publicKeyCreate} = require('ethereum-cryptography/shims/hdkey-secp256k1v3');

const key = process.argv[2]; // private key as hex string. Example: // 0x2d7cf05fb945d34f80e1e941280a5d78c5a144495b7f903c0051b77cca774993
const keyBuff = Buffer.from(key.replace('0x', ''), 'hex');
const publicKey = publicKeyCreate(keyBuff, false);
console.log('Key', key);
console.log('Public key', '0x' + publicKey.subarray(1).toString('hex'));

// use: node private-to-public.js 0x2d7cf05fb945d34f80e1e941280a5d78c5a144495b7f903c0051b77cca774993
