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
  return /^0x[\da-f]+$/i.test(hex) || 'Invalid hex';
}

export function validateOracle(hex: string): boolean | string {
  return /^0x[\da-f]{128}$/i.test(hex) || 'Invalid 64 byte hex';
}

export function validateBlockchainId(blockchainId: string): boolean | string {
  return /^[a-z\d]{1,4}$/i.test(blockchainId) || 'Invalid blockchain id';
}

export function validateLockId(lockId: string): boolean | string {
  return /^\d{37,39}$/i.test(lockId) || 'Invalid lock id';
}
