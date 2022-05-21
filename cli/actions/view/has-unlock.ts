import {setBridgeAddress} from '../settings/settings';
import {displayArgs, handleInterrupt, hasUnlockInfo} from '../../utils';
import * as inquirer from 'inquirer';

export async function hasUnlock() {
  try {
    await setBridgeAddress(true);
    const {
      lockId, lockSource
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'lockId',
          message: 'Lock id',
        },
        {
          type: 'input',
          name: 'lockSource',
          message: 'Lock source (1 - 4 symbols)',
        },
      ]);

    const hasUnlockResult = await hasUnlockInfo(lockId, lockSource);

    await displayArgs('Unlock info:', [
      {key: 'Lock id', value: lockId},
      {key: 'lock source', value: lockSource},
      {key: 'Has unlock', value: hasUnlockResult.toString()},
    ], false)

  } catch (e) {
    handleInterrupt(e)
  }
}

