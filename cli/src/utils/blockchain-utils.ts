import {Store} from '../store';
import {setBridgeAddress, setNetwork, setValidatorAddress} from '../actions/settings/settings';
import axios from 'axios';
import {DataTransactionEntry} from '@waves/ts-types';
import {
  base58ToBase64,
  base64ToBuffer,
  bufferToUtf8,
  lockSourceAndIdToKey,
  normalizeHex,
  wavesSourceToSourceAndAddress
} from './utils';
import base58 from 'bs58';
import {BN, bufferToHex} from 'ethereumjs-util';

export interface BridgeAssetInfo {
  assetSourceAndAddress: string;
  assetId: string;
  precision: number;
  assetSource: string;
  isActive: boolean;
  minFee: number;
  assetSourceAddress: string;
  assetType: string
}

export interface ChainAssetInfo {
  assetId: string,
  issuer: string,
  name: string,
  description: string,
  decimals: number,
  quantity: number,
}

export interface ValidatorInfo {
  admin: string;
  version: number;
  bridge: string;
  oracle: string;
}

export interface LockInfo {
  assetSourceAndAddress: string;
  destination: string;
  amount: number;
  recipient: string;
}

interface BridgeInfo {
  baseFeeRateBP: number;
  validator: string;
  feeCollector: string;
  unlockSigner: string
  isActive: boolean;
  bridgeManager: string;
  assetManager: string;
  stopManager: string;
}


export async function getChainAssetInfo(assetId: string): Promise<ChainAssetInfo> {
  if (assetId === '6scFjhFGDfpmYySMKQ9vDbZuH8aMRWsUQJAHXzm1FsJo') {
    return  {
      name: 'WAVES',
      description: 'Waves base asset',
      assetId: '6scFjhFGDfpmYySMKQ9vDbZuH8aMRWsUQJAHXzm1FsJo',
      issuer: '',
      decimals: 8,
      quantity: 0,
    }
  }
  if (!Store.node) {
    await setNetwork()
  }
  const response = await axios.get(`${Store.node.address}/assets/details/${assetId}`)
  return response.data;
}


export async function getAssetId(source: string): Promise<string> {
  await setBridgeAddress(true);
  const keyAssetAddress = `${source}_aa`;
  const entries = await fetchData(Store.bridgeAddress, [
    keyAssetAddress,
  ]);

  return base58.encode(entries[keyAssetAddress]);
}

export async function getLockInfo(lockId: string): Promise<LockInfo> {
  await setValidatorAddress(true)
  const lockIdB64 = new BN(lockId).toBuffer().toString('base64');
  const keyLockRecipient = `${lockIdB64}_lr`;
  const keyLockAmount = `${lockIdB64}_la`;
  const keyLockDestination = `${lockIdB64}_ld`;
  const keyLockAssetSource = `${lockIdB64}_las`;

  const entries = await fetchData(Store.validatorAddress, [
    keyLockRecipient,
    keyLockAmount,
    keyLockDestination,
    keyLockAssetSource,
  ]);

  return {
    assetSourceAndAddress: entries[keyLockAssetSource].toString('base64'),
    destination: bufferToUtf8(entries[keyLockDestination]),
    amount: entries[keyLockAmount] / 1e9,
    recipient: bufferToHex(entries[keyLockRecipient]),
  }
}

export async function getBridgeAssetInfo(assetId: string): Promise<BridgeAssetInfo> {
  await setBridgeAddress(true);
  const assetIdB64 = base58ToBase64(assetId);
  const keyAssetAddress = `${assetIdB64}_aa`;
  const keyAssetType = `${assetIdB64}_at`;
  const keyAssetPrecision = `${assetIdB64}_ap`;
  const keyAssetMinFee = `${assetIdB64}_amf`;
  const keyAssetIsActive = `${assetIdB64}_aia`;

  const entries = await fetchData(Store.bridgeAddress, [
    keyAssetAddress,
    keyAssetType,
    keyAssetPrecision,
    keyAssetMinFee,
    keyAssetIsActive
  ]);

  const { tokenSourceAddress, tokenSource } = wavesSourceToSourceAndAddress(
    entries[keyAssetAddress],
  );

  const assetTypeArray = ['Base', 'Native', 'Wrapped'];

  return {
    assetId: assetId,
    assetSourceAndAddress: entries[keyAssetAddress].toString('base64'),
    assetSource: tokenSource,
    assetSourceAddress: tokenSourceAddress,
    assetType: assetTypeArray[entries[keyAssetType]],
    precision: entries[keyAssetPrecision],
    minFee: entries[keyAssetMinFee],
    isActive: entries[keyAssetIsActive]
  }
}

export async function getRawBridgeInfo(): Promise<BridgeInfo> {
  await setBridgeAddress(true);

  const keyBaseFeeRateBP = "_bfr"
  const keyValidator = "_v"
  const keyFeeCollector = "_fc"
  const keyUnlockSigner = "_us"
  const keyIsActive = "_ia"
  const keyBridgeManager = "BRIDGE_MANAGER_m"
  const keyAssetManager = "ASSET_MANAGER_m"
  const keyStopManager = "STOP_MANAGER_m"

  const entries = await fetchData(Store.bridgeAddress, [
    keyBaseFeeRateBP,
    keyValidator,
    keyFeeCollector,
    keyUnlockSigner,
    keyIsActive,
    keyBridgeManager,
    keyAssetManager,
    keyStopManager,
  ]);


  return {
    isActive: entries[keyIsActive],
    baseFeeRateBP: entries[keyBaseFeeRateBP],
    validator: base58.encode(entries[keyValidator]),
    feeCollector: base58.encode(entries[keyFeeCollector]),
    unlockSigner: base58.encode(entries[keyUnlockSigner]),
    bridgeManager: base58.encode(entries[keyBridgeManager]),
    assetManager: base58.encode(entries[keyAssetManager]),
    stopManager: base58.encode(entries[keyStopManager]),
  }

}

export async function getRawValidatorInfo(): Promise<ValidatorInfo> {
  await setValidatorAddress(true);

  const keyVersion = "_v"
  const keyBridge = "_b"
  const keyOracle = "_o"
  const keyAdmin = "_a"

  const entries = await fetchData(Store.validatorAddress, [
    keyVersion,
    keyBridge,
    keyOracle,
    keyAdmin,
  ]);

  return {
    version: entries[keyVersion][0],
    bridge: base58.encode(entries[keyBridge]),
    oracle: normalizeHex(entries[keyOracle].toString('hex')),
    admin: base58.encode(entries[keyAdmin])
  }

}


export async function hasUnlockInfo(lockId: string, lockSource: string): Promise<boolean> {
  await setValidatorAddress(true);
  const keyUnlock = lockSourceAndIdToKey(lockSource, lockId);
  const entries = await fetchData(Store.validatorAddress, [
    keyUnlock,
  ]);
  return entries[keyUnlock] || false;
}

async function fetchData(
  address: string,
  keys: string[],
): Promise<{ [key: string]: any }> {
  await setNetwork(true);
  const response = await axios.post(
    `${Store.node.address}/addresses/data/${address}`,
    { keys },
  );

  const result = {};
  (response.data || []).forEach((entry) => {
    const keyValue = dataEntryToKeyValue(entry);
    result[keyValue.key] = keyValue.value;
  });
  return result;

}

function dataEntryToKeyValue(entry: DataTransactionEntry): {
  key: string;
  value: string | boolean | Buffer;
} {
  let value: any;
  const key = entry.key;
  switch (entry.type) {
    case 'string':
    case 'boolean':
      value = entry.value;
      break;
    case 'integer':
      value = entry.value;
      break;
    case 'binary':
      value = base64ToBuffer(entry.value);
      break;
    default:
      throw new Error('Invalid data entry type');
  }
  return { key, value };
}
