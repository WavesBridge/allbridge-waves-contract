import inquirer from 'inquirer';
import {deployBridge} from './deploy-bridge';
import {deployValicator} from './deploy-validator';

export async function deploy() {
  const {action} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to deploy?',
        choices: ['Deploy Bridge', 'Deploy Validator', '..']
      }
    ]).catch(() => '..');

  switch (action) {
    case 'Deploy Bridge':
      return await deployBridge();
    case 'Deploy Validator':
      return await deployValicator();
    default:
      return
  }
}
