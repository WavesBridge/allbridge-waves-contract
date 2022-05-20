import * as inquirer from 'inquirer';
import {authLedger} from './auth-ledger';
import {authKeyFile} from './auth-key-file';
import {Store} from '../../store';
import {setNetwork} from '../settings/settings';
import {Separator} from 'inquirer';

enum AUTH_TYPE {
  LEDGER,
  KEY_FILE
}

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
        choices: [
          {name: 'Ledger', value: AUTH_TYPE.LEDGER},
          {name: 'Key file', value: AUTH_TYPE.KEY_FILE},
          '..',
          new Separator()
        ]
      }
    ]).catch(() => ({action: '..'}));

  switch (authType) {
    case AUTH_TYPE.LEDGER:
      return authLedger()
    case AUTH_TYPE.KEY_FILE:
      return authKeyFile()
    default:
      return
  }
}
