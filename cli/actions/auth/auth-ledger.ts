import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {chainIdToName, handleInterrupt} from '../../utils/utils';
import clc from 'cli-color';
import {setNetwork} from '../settings/settings';
import {getLedgerUser} from '../../utils/ledger-utils';

export async function authLedger() {
  if (!Store.node) {
    await setNetwork()
  }
  try {
    const {accountIndex} = await inquirer
      .prompt([
        {
          type: 'number',
          name: 'accountIndex',
          message: 'What account index would you like to use?',
          default: Store.ledgerUserId
        }
      ]);

    try {
      const account = await getLedgerUser(accountIndex);
      console.log(`Selected account is: ${clc.green(account.address)} (${chainIdToName(Store.node.chainId)})`)
      Store.ledgerUserId = accountIndex;
      Store.useLedger = true;
    } catch (e) {
      console.log(clc.red('Cannot auth\n'));
    }
  } catch (e) {
    handleInterrupt(e)
  }
}

