import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {chainIdToName, displayArgs, handleInterrupt} from '../../utils/utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress} from '../../utils/validators';

export async function setAdmin() {
  try {
    const signer = await getCurrentUser();
    const {admin} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'admin',
          message: 'Write new admin address',
          validate: validateAddress
        }
      ]);

    await displayArgs('You are going to set new manager', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "New admin", value: admin},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: 'setAdmin',
        args: [
          {type: 'string', value: admin},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e);
  }
}
