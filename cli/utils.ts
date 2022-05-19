import base58 from 'bs58';
import {Store} from './config/store';
import {base58Encode, blake2b, signBytes} from '@waves/ts-lib-crypto';
import {broadcast, seedUtils} from '@waves/waves-transactions';
import {auth} from './config/auth';
import {default as WavesLedger} from '@waves/ledger';
import {default as TransportNodeHid} from '@ledgerhq/hw-transport-node-hid-singleton';
import {IInvokeScriptParams, ISetScriptParams, WithId, WithProofs} from '@waves/waves-transactions/src/transactions';
import {InvokeScriptTransaction, SetScriptTransaction, TRANSACTION_TYPE} from '@waves/ts-types';
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

export function chainIdToName(chinId: number | string): string {
  switch (chinId) {
    case 'W':
    case 87:
      return 'mainnet'
    case 'T':
    case 84:
      return 'testnet'
    case 'S':
    case 83:
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
    const spinner = new CLI.Spinner('Approve transaction with your Ledger device', ['⣾','⣽','⣻','⢿','⡿','⣟','⣯','⣷']);
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

  const tx: SetScriptTransaction & WithId & WithProofs & {feeAssetId: string | null}= {
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
  return await broadcast(tx, nodeUrl)
    .then(result => {
      console.log((clc.green(`Transaction is successful: ${getTxUrl(result.id)}`)));
      console.log()
      return result
    })
    .catch((e) => {
      console.log(clc.red(`Transaction is failed:`), e.message)
      console.log()
    })
}


export async function displayArgs(message: string, args: { key: string, value: string }[]): Promise<boolean> {
  console.log()

  const maxKeyLength = args.reduce((max, {key}) => Math.max(max, key.length), 0);
  const maxValueLength = args.reduce((max, {value}) => Math.max(max, value.length), 0);
  console.log(clc.yellow(message))

  for (const {key, value} of args) {
    new CLI.Line()
      .column(key, maxKeyLength + 4)
      .column(value, maxValueLength, [clc.cyan]).output();
  }
  console.log()
  const {confirm} = await inquirer
    .prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you ready to process transaction?'
    }]);
  return confirm;
}

export function getTxUrl(txId: string): string {
  switch (Store.node.chainId) {
    case 84:
      return `https://new.wavesexplorer.com/transactions/${txId}?network=testnet`
    case 87:
      return `https://new.wavesexplorer.com/transactions/${txId}`
    case 83:
      return `https://new.wavesexplorer.com/transactions/${txId}?network=stagenet`
    default:
      return txId
  }
}

export function validateAddress(address: string): boolean | string {
  try {
    if (base58.decode(address).length !== 26){
      return 'Invalid address'
    }
    return true;
  } catch (e) {
    return 'Invalid address'
  }
}
