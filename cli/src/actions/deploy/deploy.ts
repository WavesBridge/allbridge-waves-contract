import inquirer, {Separator} from 'inquirer';
import {deployBridge} from './deploy-bridge';
import {deployValidator} from './deploy-validator';
import {handleInterrupt} from '../../utils/utils';
import {deployUnitBridge} from './deploy-unit-bridge';

enum DEPLOY_ACTION {
  BRIDGE,
  UNIT_BRIDGE,
  VALIDATOR,
}

export async function deploy() {
  const {action} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to deploy?',
        choices: [
          {name: 'Deploy Bridge', value: DEPLOY_ACTION.BRIDGE},
          {name: 'Deploy Unit Bridge', value: DEPLOY_ACTION.UNIT_BRIDGE},
          {name: 'Deploy Validator', value: DEPLOY_ACTION.VALIDATOR},
          '..',
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  switch (action) {
    case DEPLOY_ACTION.BRIDGE:
      return await deployBridge();
    case DEPLOY_ACTION.UNIT_BRIDGE:
      return await deployUnitBridge();
    case DEPLOY_ACTION.VALIDATOR:
      return await deployValidator();
    default:
      return
  }
}
