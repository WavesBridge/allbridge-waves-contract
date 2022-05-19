import * as inquirer from 'inquirer';
import {Store} from './store';
import {chainIdToName, getLedger} from '../utils';
import clc from 'cli-color';
import {setNetwork} from './settings';

export async function authLedger() {
  if (!Store.node) {
    await setNetwork()
  }

  const {accountIndex} = await inquirer
    .prompt([
      {
        type: 'number',
        name: 'accountIndex',
        message: 'What account index would you like to use?',
        default: Store.ledgerUserId
      }
    ]);

  const ledger = getLedger(Store.node.chainId)

  try {
    const account = await ledger.getUserDataById(accountIndex);

    console.log(`Selected account id: ${account.address} (${chainIdToName(Store.node.chainId)})`)
    Store.ledgerUserId = accountIndex;
    Store.useLedger = true;
  } catch (e) {
    console.log(clc.red('Please, connect your Ledger Device and enter to the Waves application\n'));
  }
}

