import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {chainIdToName, getLedger, spinnerStyle} from '../../utils';
import clc from 'cli-color';
import {setNetwork} from '../settings/settings';
import {Spinner} from 'clui';

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


    const ledger = getLedger(Store.node.chainId)

    const spinner = new Spinner('Please, connect your Ledger Device and enter to the Waves application', spinnerStyle);
    try {
      spinner.start();
      const account = await ledger.getUserDataById(accountIndex);
      spinner.stop();
      console.log(`Selected account id: ${account.address} (${chainIdToName(Store.node.chainId)})`)
      Store.ledgerUserId = accountIndex;
      Store.useLedger = true;
    } catch (e) {
      spinner.stop();
      console.log(clc.red('Connection timeout. Please, connect your Ledger Device and enter to the Waves application\n'));
    }
  } catch (e) {
    if (e === 'EVENT_INTERRUPTED') {
      return
    } else {
      throw e
    }
  }
}

