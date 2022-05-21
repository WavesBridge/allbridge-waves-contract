import base58 from 'bs58';

export function validateAddress(address: string): boolean | string {
  try {
    if (base58.decode(address).length !== 26) {
      return 'Invalid address'
    }
    return true;
  } catch (e) {
    return 'Invalid address'
  }
}

export function validateAssetId(address: string): boolean | string {
  try {
    if (base58.decode(address).length !== 32) {
      return 'Invalid asset id'
    }
    return true;
  } catch (e) {
    return 'Invalid asset id'
  }
}

export function validateHex(hex: string): boolean | string {
  return /^0x[0-9a-f]+$/i.test(hex) || 'Invalid hex';
}
