import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  handleInterrupt,
} from '../../utils/utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setValidatorAddress} from '../settings/settings';
import * as inquirer from 'inquirer';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress} from '../../utils/validators';

export async function setAdmin() {
  try {
    if (!Store.validatorAddress) {
      await setValidatorAddress()
    }
    const signer = await getCurrentUser();

    const {
      adminAddress
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'adminAddress',
          message: 'Admin address',
          validate: validateAddress
        }
      ]);

    await displayArgs('You are going to set admin address', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Admin address", value: adminAddress},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.validatorAddress,
      call: {
        function: "setAdmin",
        args: [
          {type:'binary', value: base58ToBase64(adminAddress)},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
