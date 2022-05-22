import inquirer, {Separator} from 'inquirer';
import {CHAIN_ID, handleInterrupt} from '../../utils/utils';
import {Store} from '../../store';
import {validateAddress} from '../../utils/validators';

enum SETTINGS_ACTION {
  BRIDGE,
  VALIDATOR,
  NETWORK
}

const NODE = {
  [CHAIN_ID.MAINNET]: 'https://nodes.wavesnodes.com',
  [CHAIN_ID.TESTNET]: 'https://nodes-testnet.wavesnodes.com',
  [CHAIN_ID.STAGENET]: 'https://nodes-stagenet.wavesnodes.com'
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

export async function setBridgeAddress(fast = false) {
  if (fast && Store.bridgeAddress) {
    return
  }
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

export async function setValidatorAddress(fast = false) {
  if (fast && Store.validatorAddress) {
    return
  }
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

export async function setNetwork(fast = false) {
  if (fast && Store.node) {
    return
  }
  const {node} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'node',
        message: 'Select a network',
        choices: [
          {name: `Mainnet (${NODE[CHAIN_ID.MAINNET]})`, value: {address: NODE[CHAIN_ID.MAINNET], chainId: CHAIN_ID.MAINNET}},
          {name: `Testnet (${NODE[CHAIN_ID.TESTNET]})`, value: {address: NODE[CHAIN_ID.TESTNET], chainId: CHAIN_ID.TESTNET}},
          {name: `Stagenet (${NODE[CHAIN_ID.STAGENET]})`, value: {address: NODE[CHAIN_ID.STAGENET], chainId: CHAIN_ID.STAGENET}},
          {name: '..', value: '..'},
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  if (node) {
    Store.node = node;
  }
}


