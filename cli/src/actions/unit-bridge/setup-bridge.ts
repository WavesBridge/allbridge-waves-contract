import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {initBridge} from './init-bridge';
import {setAdmin} from './set-admin';
import {setFeeCollector} from './set-fee-collector';

enum BRIDGE_ACTION {
  INIT,
  SET_ADMIN,
  SET_FEE_COLLECTOR
}

export async function setupUnitBridge() {
  const {bridgeAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'bridgeAction',
        message: 'What do you want to do with the bridge?',
        choices: [
          {name: 'Init unit bridge', value: BRIDGE_ACTION.INIT},
          {name: 'Set manager', value: BRIDGE_ACTION.SET_ADMIN},
          {name: 'Set fee collector', value: BRIDGE_ACTION.SET_FEE_COLLECTOR},
          '..',
          new Separator()
        ],
        pageSize: 8
      }
    ]).catch(() => ({action: '..'}));

  switch (bridgeAction) {
    case BRIDGE_ACTION.INIT:
      return initBridge()
    case BRIDGE_ACTION.SET_ADMIN:
      return setAdmin()
    case BRIDGE_ACTION.SET_FEE_COLLECTOR:
      return setFeeCollector()
    default:
      return
  }
}
