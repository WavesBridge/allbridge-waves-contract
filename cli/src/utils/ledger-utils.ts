import {Waves} from '@waves/ledger/lib/Waves';
import CLI from 'clui';
import {default as TransportNodeHid} from '@ledgerhq/hw-transport-node-hid-singleton';
import clc from 'cli-color';
import {CHAIN_ID, spinnerStyle} from './utils';
import {setNetwork} from '../actions/settings/settings';
import {Store} from '../store';

function getPathById(id: number) {
  const ADDRES_PREFIX = '44\'/5741564\'/0\'/0\'/';
  return `${ADDRES_PREFIX}${id}'`;
}

let transport;

export async function getLedger(chainId: number): Promise<Waves> {
  const spinner = new CLI.Spinner('Please, connect your Ledger Device and enter to the Waves application', spinnerStyle);
  try {
    spinner.start();
    transport = await TransportNodeHid.create();
    spinner.stop();
    return new Waves(transport, chainId)
  } catch (e) {
    spinner.stop();
    console.log(clc.red('Connection timeout. Please, connect your Ledger Device and enter to the Waves application'));
    throw e
  }
}

export async function getLedgerUser(accountId: number) {
  await setNetwork(true);
  try {
    const ledger = await getLedger(Store.node.chainId);
    return await ledger.getWalletPublicKey(getPathById(accountId));
  } catch (e) {
    console.log(clc.red('Please, unlock your Ledger Device, enter to the Waves application and try again'));
    throw e;
  }
}

export async function ledgerSign(data: Uint8Array, chainId: CHAIN_ID, userId: number) {
  const ledger = await getLedger(chainId);
  const spinner = new CLI.Spinner('Approve transaction with your Ledger device', spinnerStyle);
  spinner.start();
  try {
    const signature = await ledger.signSomeData(getPathById(userId), {dataBuffer: data})
    spinner.stop();
    return signature;
  } catch (e) {
    spinner.stop();
    console.log(clc.red('Transaction was rejected'))
    throw new Error('Transaction was rejected')
  }
}
