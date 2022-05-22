import base58 from 'bs58';
import {Store} from '../store';
import clc from 'cli-color';
import CLI from 'clui';
import * as inquirer from 'inquirer';
import {BN} from 'ethereumjs-util';

export const spinnerStyle = ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'];

export enum CHAIN_ID {
  MAINNET = 87,
  TESTNET = 84,
  STAGENET = 83
}

export const EVENT_INTERRUPTED = 'EVENT_INTERRUPTED';
export function handleInterrupt(e) {
  if (e === EVENT_INTERRUPTED) {
    console.log('\n')
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


export function base64ToBuffer(value: string): Buffer {
  return Buffer.from(base64Normalize(value), 'base64');
}

export function base64Normalize(value: string): string {
  return value.replace('base64:', '');
}


export function lockSourceAndIdToKey(source: string, lockId: string): string {
  const sourceBase64 = stringToBlockchainId(source).toString('base64');
  const lockIdBase64 = new BN(lockId).toBuffer().toString('base64');
  return `${sourceBase64}_${lockIdBase64}_u`;
}

export function toInt(value: number, precision: number): number {
  return Math.floor(value * Math.pow(10, precision))
}

export function fromInt(value: number, precision: number): number {
  return value / Math.pow(10, precision)
}
