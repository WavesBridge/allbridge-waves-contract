import {IInvokeScriptParams, ISetScriptParams, WithId, WithProofs} from '@waves/waves-transactions/src/transactions';
import {InvokeScriptTransaction, SetScriptTransaction, TRANSACTION_TYPE} from '@waves/ts-types';
import {DEFAULT_VERSIONS} from '@waves/waves-transactions/dist/defaultVersions';
import {base64Prefix, fee, normalizeAssetId} from '@waves/waves-transactions/dist/generic';
import {Store} from '../store';
import {validate} from '@waves/waves-transactions/dist/validators';
import {txToProtoBytes} from '@waves/waves-transactions/dist/proto-serialize';
import {binary} from '@waves/marshall';
import {base58Encode, blake2b, signBytes} from '@waves/ts-lib-crypto';
import {spinnerStyle} from './utils';
import {auth} from '../actions/auth/auth';
import {getLedgerUser, ledgerSign} from './ledger-utils';
import {broadcast, seedUtils, waitForTx} from '@waves/waves-transactions';
import CLI from 'clui';
import clc from 'cli-color';

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
    fee: fee(params, 1500000),
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

async function sign(data: Uint8Array): Promise<string> {
  if ((!Store.useLedger && !Store.seed) || (Store.useLedger && Store.ledgerUserId == undefined)) {
    await auth(true)
  }

  if (Store.useLedger) {
    return await ledgerSign(data, Store.node.chainId, Store.ledgerUserId)
  } else {
    return signBytes(Store.seed, data);
  }
}

export async function getCurrentUser(): Promise<{ publicKey: string, address: string }> {
  if ((!Store.useLedger && !Store.seed) || (Store.useLedger && Store.ledgerUserId == undefined)) {
    await auth(true)
  }

  if (Store.useLedger) {
    const userData = await getLedgerUser(Store.ledgerUserId);
    return {publicKey: userData.publicKey, address: userData.address};
  } else {
    const seed = new seedUtils.Seed(Store.seed, String.fromCharCode(Store.node.chainId));
    return {publicKey: seed.keyPair.publicKey, address: seed.address};
  }
}

async function broadcastTx(tx: any, nodeUrl: string): Promise<any> {
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
