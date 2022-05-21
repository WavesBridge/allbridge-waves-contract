import {
  chainIdToName,
  displayArgs,
  handleInterrupt,
  hexToBase64,
} from '../../utils/utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setValidatorAddress} from '../settings/settings';
import * as inquirer from 'inquirer';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateHex} from '../../utils/validators';

export async function setOracle() {
  try {
    if (!Store.validatorAddress) {
      await setValidatorAddress()
    }
    const signer = await getCurrentUser();

    const {
      oraclePublicKey
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'oraclePublicKey',
          message: 'Full oracle public key (hex)',
          validate: validateHex
        },
      ]);

    await displayArgs('You are going to set validator oracle public key', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Oracle public key", value: oraclePublicKey},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.validatorAddress,
      call: {
        function: "setOracle",
        args: [
          {type:'binary', value: hexToBase64(oraclePublicKey)},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
