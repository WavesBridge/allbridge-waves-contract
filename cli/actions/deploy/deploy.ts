import inquirer, {Separator} from 'inquirer';
import {deployBridge} from './deploy-bridge';
import {deployValicator} from './deploy-validator';

enum DEPLOY_ACTION {
  BRIDGE,
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
          {name: 'Deploy Validator', value: DEPLOY_ACTION.VALIDATOR},
          '..',
          new Separator()
        ]
      }
    ]).catch(() => ({action: '..'}));

  switch (action) {
    case DEPLOY_ACTION.BRIDGE:
      return await deployBridge();
    case DEPLOY_ACTION.VALIDATOR:
      return await deployValicator();
    default:
      return
  }
}
