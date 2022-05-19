import inquirer from 'inquirer';
import {validateAddress} from '../utils';
import {Store} from './store';

const nodeList = [
  {name: 'Mainnet', address: 'https://nodes.wavesnodes.com', chainId: 87},
  {name: 'Testnet', address: 'https://nodes-testnet.wavesnodes.com', chainId: 84},
  {name: 'Stagenet', address: 'https://nodes-stagenet.wavesnodes.com', chainId: 83}
]

export async function settings() {
  const {action} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to change?',
        choices: ['Set bridge address', 'Set validator address', 'Set network', '..']
      }
    ]);

  switch (action) {
    case 'Set bridge address':
      return await setBridgeAddress();
    case 'Set validator address':
      return await setValidatorAddress();
    case 'Set network':
      return await setNetwork();
    default:
      return
  }
}

async function setBridgeAddress() {
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
}

async function setValidatorAddress() {
  const {validatorAddress} = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'validatorAddress',
        message: 'Specify a validator address',
        validate: validateAddress,
        default: Store.bridgeAddress
      }
    ]);

  Store.validatorAddress = validatorAddress;
}

export async function setNetwork() {
  const {node} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'node',
        message: 'Select a network',
        choices: nodeList.map(node => ({
          name: `${node.name} (${node.address})`,
          value: {address: node.address, chainId: node.chainId}
        }))
      }
    ]);
  Store.node = node;
}


