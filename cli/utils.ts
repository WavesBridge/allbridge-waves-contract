import base58 from 'bs58';
import {Store} from './store';
import {base58Encode, blake2b, signBytes} from '@waves/ts-lib-crypto';
import {broadcast, seedUtils, waitForTx} from '@waves/waves-transactions';
import {auth} from './actions/auth/auth';
import {default as WavesLedger} from '@waves/ledger';
import {default as TransportNodeHid} from '@ledgerhq/hw-transport-node-hid-singleton';
import {IInvokeScriptParams, ISetScriptParams, WithId, WithProofs} from '@waves/waves-transactions/src/transactions';
import {DataTransactionEntry, InvokeScriptTransaction, SetScriptTransaction, TRANSACTION_TYPE} from '@waves/ts-types';
import {DEFAULT_VERSIONS} from '@waves/waves-transactions/dist/defaultVersions';
import {
  fee,
  normalizeAssetId,
  base64Prefix
} from '@waves/waves-transactions/dist/generic';
import {validate} from '@waves/waves-transactions/dist/validators';
import {txToProtoBytes} from '@waves/waves-transactions/dist/proto-serialize';
import {binary} from '@waves/marshall';
import clc from 'cli-color';
import CLI from 'clui';
import * as inquirer from 'inquirer';
import axios from 'axios';
import {setBridgeAddress, setNetwork, setValidatorAddress} from './actions/settings/settings';
import {BN, bufferToHex} from 'ethereumjs-util';

export const spinnerStyle = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

export enum CHAIN_ID {
  MAINNET = 87,
  TESTNET = 84,
  STAGENET = 83
}

export const EVENT_INTERRUPTED = 'EVENT_INTERRUPTED';
export function handleInterrupt(e) {
  if (e === EVENT_INTERRUPTED) {
    console.log()
    return {}
  } else {
    throw e
  }
}

export function chainIdToName(chinId: number | string): string {
  switch (chinId) {
    case 'W':
    case CHAIN_ID.MAINNET:
      return 'mainnet'
    case 'T':
    case CHAIN_ID.TESTNET:
      return 'testnet'
    case 'S':
    case CHAIN_ID.STAGENET:
      return 'stagenet'
    default:
      return 'INVALID_NETWORK'
  }
}

export function base58ToBase64(value: string): string {
  return Buffer.from(base58.decode(value)).toString('base64');
}

export function getLedger(chainId: number) {
  return new WavesLedger({
    debug: false, //boolean,
    openTimeout: 3000, //number,
    listenTimeout: 5000, //number,
    exchangeTimeout: 30000, //number,
    networkCode: chainId, //number,
    transport: TransportNodeHid
  });
}

export async function sign(data: Uint8Array): Promise<string> {
  if ((!Store.useLedger && !Store.seed) || (Store.useLedger && Store.ledgerUserId == undefined)) {
    await auth(true)
  }

  if (Store.useLedger) {
    const spinner = new CLI.Spinner('Approve transaction with your Ledger device', spinnerStyle);
    spinner.start();
    const ledger = getLedger(Store.node.chainId);
    try {
      const signature = await ledger.signSomeData(Store.ledgerUserId, {dataBuffer: data})

      await ledger.disconnect()
      spinner.stop();
      return signature;
    } catch (e) {
      spinner.stop();
      console.log('Transaction was rejected')
    }
  } else {
    return signBytes(Store.seed, data);
  }
}

export async function getCurrentUser(): Promise<{ publicKey: string, address: string }> {
  if ((!Store.useLedger && !Store.seed) || (Store.useLedger && Store.ledgerUserId == undefined)) {
    await auth(true)
  }

  if (Store.useLedger) {
    const ledger = getLedger(Store.node.chainId);
    const userData = await ledger.getUserDataById(Store.ledgerUserId);
    await ledger.disconnect();
    return {publicKey: userData.publicKey, address: userData.address};
  } else {
    const seed = new seedUtils.Seed(Store.seed, String.fromCharCode(Store.node.chainId));
    return {publicKey: seed.keyPair.publicKey, address: seed.address};
  }
}

export async function sendInvokeScript(params: IInvokeScriptParams): Promise<any> {
  const type = TRANSACTION_TYPE.INVOKE_SCRIPT;
  const version = DEFAULT_VERSIONS.INVOKE_SCRIPT as 1 | 2;
  const {publicKey} = await getCurrentUser();

  const tx: InvokeScriptTransaction & WithId & WithProofs = {
    type,
    version,
    senderPublicKey: publicKey,
    dApp: params.dApp,
    call: params.call && {args: [], ...params.call},
    payment: (params.payment || []).map(pmt => ({...pmt, assetId: pmt.assetId === 'WAVES' ? null : pmt.assetId})),
    fee: fee(params, 500000),
    feeAssetId: normalizeAssetId(params.feeAssetId),
    timestamp: params.timestamp || Date.now(),
    chainId: Store.node.chainId,
    proofs: [],
    id: '',
  }

  validate.invokeScript(tx)

  const bytes = version > 1 ? txToProtoBytes(tx) : binary.serializeTx(tx)

  tx.id = base58Encode(base58Encode(blake2b(bytes)))
  tx.proofs.push(await sign(bytes));

  return await broadcastTx(tx, Store.node.address)
}

export async function sendSetScript(params: ISetScriptParams): Promise<any> {
  const type = TRANSACTION_TYPE.SET_SCRIPT
  const version = DEFAULT_VERSIONS.SET_SCRIPT as 1 | 2;
  const {publicKey} = await getCurrentUser();

  if (params.script === undefined) throw new Error('Script field cannot be undefined. Use null explicitly to remove script')

  const tx: SetScriptTransaction & WithId & WithProofs & { feeAssetId: string | null } = {
    type,
    version,
    senderPublicKey: publicKey,
    chainId: Store.node.chainId,
    fee: fee(params, 1000000),
    feeAssetId: null,
    timestamp: params.timestamp || Date.now(),
    proofs: [],
    id: '',
    script: base64Prefix(params.script),
  }

  validate.setScript(tx)

  const bytes = version > 1 ? txToProtoBytes(tx) : binary.serializeTx(tx)

  tx.id = base58Encode(base58Encode(blake2b(bytes)))
  tx.proofs.push(await sign(bytes));

  return await broadcastTx(tx, Store.node.address)
}

export async function broadcastTx(tx: any, nodeUrl: string): Promise<any> {
  const spinner = new CLI.Spinner('Sending transaction', spinnerStyle);
  try {
    const result = await broadcast(tx, nodeUrl);
    console.log('Sending transaction', result.id);
    spinner.start();
    const waitResult = await waitForTx(result.id, {apiBase: nodeUrl});
    spinner.stop();
    console.log(clc.green(`Transaction is successful:`), result.id);
    console.log()
    if (waitResult.applicationStatus !== 'succeeded') {
      console.log(clc.red(`Transaction is failed:`, result.id))
    }
    return waitResult;
  } catch (e) {
    spinner.stop();
    console.log(clc.red(`Transaction is failed:`), e.message)
    console.log()
  }
}


export async function displayArgs(message: string, args: { key: string, value: string }[], needConfirm = true): Promise<void> {
  console.log()

  const maxKeyLength = args.reduce((max, {key}) => Math.max(max, key.length), 0);
  const maxValueLength = args.reduce((max, {value}) => Math.max(max, (value ?? '').toString().length), 0);
  console.log(clc.yellow(message))

  for (const {key, value} of args) {
    new CLI.Line()
      .column((' ').repeat(maxKeyLength - key.length + 2) + key, maxKeyLength + 4,)
      .column((value ?? '').toString(), maxValueLength, [clc.cyan]).output();
  }
  console.log()
  if (needConfirm) {
    const {confirm} = await inquirer
      .prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Are you ready to process transaction?'
      }]);
    if (!confirm) {
      throw EVENT_INTERRUPTED
    }
  }
}

export function getTxUrl(txId: string): string {
  switch (Store.node.chainId) {
    case CHAIN_ID.TESTNET:
      return `https://new.wavesexplorer.com/transactions/${txId}?network=testnet`
    case CHAIN_ID.MAINNET:
      return `https://new.wavesexplorer.com/transactions/${txId}`
    case CHAIN_ID.STAGENET:
      return `https://new.wavesexplorer.com/transactions/${txId}?network=stagenet`
    default:
      return txId
  }
}

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


export function utf8ToBuffer(data: string, length: number): Buffer {
  return Buffer.concat([Buffer.from(data), Buffer.alloc(length, 0)], length);
}

export function stringToBlockchainId(data: string): Buffer {
  return utf8ToBuffer(data, 4);
}

export function hexToBuffer(data: string, length: number): Buffer {
  return Buffer.concat(
    [Buffer.from(data.replace(/^0x/i, ''), 'hex'), Buffer.alloc(length, 0)],
    length,
  );
}

export function normalizeHex(hex: string): string {
  return '0x' + hex.toLowerCase().replace(/^0x/i, '');
}

export function bufferToUtf8(buff: Buffer): string {
  return buff.toString().replace(/\u0000/g, '');
}


export function hexToBase64(data: string): string {
  return Buffer.from(data.replace(/^0x/i, ''), 'hex').toString('base64')
}

export function tokenSourceAndAddressToWavesSource(
  tokenSource: string,
  tokenAddress: string,
): string {
  const sourceBuffer = stringToBlockchainId(tokenSource);
  const lockIdBuffer = hexToBuffer(tokenAddress, 32);
  return Buffer.concat([sourceBuffer, lockIdBuffer]).toString('base64');
}

export function wavesSourceToSourceAndAddress(source: Buffer): {
  tokenSource: string;
  tokenSourceAddress: string;
} {
  const sourceBuff = source.slice(0, 4);
  const addressBuff = source.slice(4);
  return {
    tokenSource: bufferToUtf8(sourceBuff),
    tokenSourceAddress: normalizeHex(addressBuff.toString('hex')),
  };
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

export function toInt(value: number, precision: number): number {
  return Math.floor(value * Math.pow(10, precision))
}

export function fromInt(value: number, precision: number): number {
  return value / Math.pow(10, precision)
}

export function dataEntryToKeyValue(entry: DataTransactionEntry): {
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

export function base64ToBuffer(value: string): Buffer {
  return Buffer.from(base64Normalize(value), 'base64');
}

export function base64Normalize(value: string): string {
  return value.replace('base64:', '');
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

export async function getAssetId(source: string): Promise<string> {
  await setBridgeAddress(true);
  const keyAssetAddress = `${source}_aa`;
  const entries = await fetchData(Store.bridgeAddress, [
    keyAssetAddress,
  ]);

  return base58.encode(entries[keyAssetAddress]);
}

export interface LockInfo {
  assetSourceAndAddress: string;
  destination: string;
  amount: number;
  recipient: string;
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

export function lockSourceAndIdToKey(source: string, lockId: string): string {
  const sourceBase64 = stringToBlockchainId(source).toString('base64');
  const lockIdBase64 = new BN(lockId).toBuffer().toString('base64');
  return `${sourceBase64}_${lockIdBase64}_u`;
}

export async function hasUnlockInfo(lockId: string, lockSource: string): Promise<boolean> {
  await setValidatorAddress(true);
  const keyUnlock = lockSourceAndIdToKey(lockSource, lockId);
  const entries = await fetchData(Store.validatorAddress, [
    keyUnlock,
  ]);
  return entries[keyUnlock] || false;
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

export interface ValidatorInfo {
  admin: string;
  version: number;
  bridge: string;
  oracle: string;
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
