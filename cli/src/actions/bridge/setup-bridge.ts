import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {initBridge} from './init-bridge';
import {setManager} from './set-manager';
import {setFeeCollector} from './set-fee-collector';
import {setValidator} from './set-validator';
import {startBridge} from './start-bridge';
import {stopBridge} from './stop-bridge';

enum BRIDGE_ACTION {
  INIT,
  SET_MANAGER,
  SET_FEE_COLLECTOR,
  SET_VALIDATOR,
  START_BRIDGE,
  STOP_BRIDGE
}

export async function setupBridge() {
  const {bridgeAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'bridgeAction',
        message: 'What do you want to do with the bridge?',
        choices: [
          {name: 'Init bridge', value: BRIDGE_ACTION.INIT},
          {name: 'Set manager', value: BRIDGE_ACTION.SET_MANAGER},
          {name: 'Set fee collector', value: BRIDGE_ACTION.SET_FEE_COLLECTOR},
          {name: 'Set validator', value: BRIDGE_ACTION.SET_VALIDATOR},
          {name: 'Start bridge', value: BRIDGE_ACTION.START_BRIDGE},
          {name: 'Stop bridge', value: BRIDGE_ACTION.STOP_BRIDGE},
          '..',
          new Separator()
        ],
        pageSize: 8
      }
    ]).catch(() => ({action: '..'}));

  switch (bridgeAction) {
    case BRIDGE_ACTION.INIT:
      return initBridge()
    case BRIDGE_ACTION.SET_MANAGER:
      return setManager()
    case BRIDGE_ACTION.SET_FEE_COLLECTOR:
      return setFeeCollector()
    case BRIDGE_ACTION.SET_VALIDATOR:
      return setValidator()
    case BRIDGE_ACTION.START_BRIDGE:
      return startBridge()
    case BRIDGE_ACTION.STOP_BRIDGE:
      return stopBridge()
    default:
      return
  }
}
