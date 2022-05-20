import inquirer, {Separator} from 'inquirer';
import {CHAIN_ID, handleInterrupt, validateAddress} from '../../utils';
import {Store} from '../../store';

enum SETTINGS_ACTION {
  BRIDGE,
  VALIDATOR,
  NETWORK
}

export async function settings() {
  const {action} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to change?',
        choices: [
          {name: 'Set bridge address', value: SETTINGS_ACTION.BRIDGE},
          {name: 'Set validator address', value: SETTINGS_ACTION.VALIDATOR},
          {name: 'Set network', value: SETTINGS_ACTION.NETWORK},
          '..',
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  switch (action) {
    case SETTINGS_ACTION.BRIDGE:
      return await setBridgeAddress();
    case SETTINGS_ACTION.VALIDATOR:
      return await setValidatorAddress();
    case SETTINGS_ACTION.NETWORK:
      return await setNetwork();
    default:
      return
  }
}

export async function setBridgeAddress() {
  try {
    const {bridgeAddress} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'bridgeAddress',
          message: 'Specify a bridge address',
          validate: validateAddress,
          default: Store.bridgeAddress
        }
      ]);

    Store.bridgeAddress = bridgeAddress;
  } catch (e) {
    handleInterrupt(e)
  }
}

export async function setValidatorAddress() {
  try {
    const {validatorAddress} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'validatorAddress',
          message: 'Specify a validator address',
          validate: validateAddress,
          default: Store.validatorAddress
        }
      ]);

    Store.validatorAddress = validatorAddress;
  } catch (e) {
    handleInterrupt(e)
  }
}

export async function setNetwork() {
  const {node} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'node',
        message: 'Select a network',
        choices: [
          {name: 'Mainnet', value: {address: 'https://nodes.wavesnodes.com', chainId: CHAIN_ID.MAINNET}},
          {name: 'Testnet', value: {address: 'https://nodes-testnet.wavesnodes.com', chainId: CHAIN_ID.TESTNET}},
          {name: 'Stagenet', value: {address: 'https://nodes-stagenet.wavesnodes.com', chainId: CHAIN_ID.STAGENET}},
          {name: '..', value: ''},
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  if (node) {
    Store.node = node;
  }
}


