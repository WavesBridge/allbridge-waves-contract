import * as inquirer from 'inquirer';
import {Store} from '../../config/store';
import {base58ToBase64, chainIdToName, displayArgs, getCurrentUser, sendInvokeScript, validateAddress} from '../../utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';

export async function setManager() {
  const signer = await getCurrentUser();
  const {managerType, managerAddress} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'managerType',
        message: 'Select manager type',
        choices: [{name: 'Bridge manager', value: 'BRIDGE_MANAGER'}, {
          name: 'Asset manager',
          value: 'ASSET_MANAGER'
        }, {name: 'Stop manager', value: 'STOP_MANAGER'}]
      },
      {
        type: 'input',
        name: 'managerAddress',
        message: 'Write new owner address',
        validate: validateAddress
      }
    ]);

  const isReady = await displayArgs('You are going to set new manager', [
    {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
    {key: "Bridge", value: Store.bridgeAddress},
    {key: "Manager type", value: managerType},
    {key: "New manager", value: managerAddress},
    {key: "Signer", value: signer.address},
  ])

  if (!isReady) {
    return;
  }

  const params: IInvokeScriptParams = {
    dApp: Store.bridgeAddress,
    call: {
      function: 'setManager',
      args: [
        {type: 'string', value: managerType},
        {type: 'binary', value: base58ToBase64(managerAddress)}
      ]
    }
  }

  await sendInvokeScript(params);
}
