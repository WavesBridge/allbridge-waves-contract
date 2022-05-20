import base58 from 'bs58';
import {Store} from './store';
import {base58Encode, blake2b, signBytes} from '@waves/ts-lib-crypto';
import {broadcast, seedUtils, waitForTx} from '@waves/waves-transactions';
import {auth} from './actions/auth/auth';
import {default as WavesLedger} from '@waves/ledger';
import {default as TransportNodeHid} from '@ledgerhq/hw-transport-node-hid-singleton';
import {IInvokeScriptParams, ISetScriptParams, WithId, WithProofs} from '@waves/waves-transactions/src/transactions';
import {InvokeScriptTransaction, SetScriptTransaction, Transaction, TRANSACTION_TYPE} from '@waves/ts-types';
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
import {setNetwork} from './actions/settings/settings';

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


export async function displayArgs(message: string, args: { key: string, value: string }[]): Promise<void> {
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

export function tokenSourceAndAddressToWavesSource(
  tokenSource: string,
  tokenAddress: string,
): string {
  const sourceBuffer = stringToBlockchainId(tokenSource);
  const lockIdBuffer = hexToBuffer(tokenAddress, 32);
  return Buffer.concat([sourceBuffer, lockIdBuffer]).toString('base64');
}

export async function getAssetInfo(assetId: string) {
  if (!Store.node) {
    await setNetwork()
  }
  const response = await axios.get(`${Store.node.address}/assets/details/${assetId}`)
  return response.data;
}
