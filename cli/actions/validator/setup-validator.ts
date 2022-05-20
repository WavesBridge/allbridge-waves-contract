import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';

enum VALIDATOR_ACTION {
  INIT,
  SET_ADMIN,
  SET_ORACLE,
  SET_BRIDGE,
}

export async function setupValidator() {
  const {validatorAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'validatorAction',
        message: 'What do you want to do with the validator?',
        choices: [
          {name: 'Init validator', value: VALIDATOR_ACTION.INIT},
          {name: 'Set admin', value: VALIDATOR_ACTION.SET_ADMIN},
          {name: 'Set oracle', value: VALIDATOR_ACTION.SET_ORACLE},
          {name: 'Set bridge address', value: VALIDATOR_ACTION.SET_BRIDGE},
          '..',
          new Separator()
        ]
      }
    ]).catch(() => ({action: '..'}));

  switch (validatorAction) {
    default:
      return
  }
}
