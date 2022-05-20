import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {initValidator} from './init-validator';
import {setAdmin} from './set-admin';
import {setOracle} from './set-oracle';
import {setValidatorBridge} from './set-bridge';
import {handleInterrupt} from '../../utils';

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
    ]).catch(handleInterrupt);

  switch (validatorAction) {
    case VALIDATOR_ACTION.INIT:
      return initValidator()
    case VALIDATOR_ACTION.SET_ADMIN:
      return setAdmin()
    case VALIDATOR_ACTION.SET_ORACLE:
      return setOracle()
    case VALIDATOR_ACTION.SET_BRIDGE:
      return setValidatorBridge()
    default:
      return
  }
}
