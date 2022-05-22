import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {getAssetInfo} from './get-asset-info';
import {getLock} from './get-lock';
import {hasUnlock} from './has-unlock';
import {getBridgeInfo} from './get-bridge-info';
import {getValidatorInfo} from './get-validator-info';

enum VIEW_ACTION {
  ASSET,
  LOCK,
  UNLOCK,
  BRIDGE,
  VALIDATOR
}

export async function view() {
  const {viewAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'viewAction',
        message: 'What do you want to view?',
        choices: [
          {name: 'Get asset info', value: VIEW_ACTION.ASSET},
          {name: 'Get lock info', value: VIEW_ACTION.LOCK},
          {name: 'Has unlock', value: VIEW_ACTION.UNLOCK},
          {name: 'Get bridge info', value: VIEW_ACTION.BRIDGE},
          {name: 'Get validator info', value: VIEW_ACTION.VALIDATOR},
          '..',
          new Separator()
        ]
      }
    ]).catch(() => ({action: '..'}));

  switch (viewAction) {
    case VIEW_ACTION.ASSET:
      return getAssetInfo()
    case VIEW_ACTION.LOCK:
      return getLock()
    case VIEW_ACTION.UNLOCK:
      return hasUnlock()
    case VIEW_ACTION.BRIDGE:
      return getBridgeInfo()
    case VIEW_ACTION.VALIDATOR:
      return getValidatorInfo()
    default:
      return
  }
}
