import * as inquirer from 'inquirer';
import {authLedger} from './auth-ledger';
import {authKeyFile} from './auth-key-file';
import {Store} from './store';
import {setNetwork} from './settings';

export async function auth(fast = false) {
  if (!Store.node) {
    await setNetwork()
  }
  if (fast && typeof Store.useLedger === 'boolean') {
    if (Store.useLedger) {
      return authLedger();
    } else {
      return authKeyFile(true)
    }
  }

  const {authType} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'authType',
        message: 'Select auth option',
        choices: ['Ledger', 'Key file']
      }
    ]);

  switch (authType) {
    case 'Ledger':
      return authLedger()
    case 'Key file':
      return authKeyFile()
  }
}
