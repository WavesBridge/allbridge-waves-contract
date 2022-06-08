import {
  chainIdToName,
  displayArgs,
  handleInterrupt,
} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress} from '../../utils/validators';

export async function setUnlockSigner() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      unlockSigner
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'unlockSigner',
          message: 'Unlock signer address',
          validate: validateAddress
        }
      ]);

    await displayArgs('You are going to set bridge unlock signer address', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Unlock signer", value: unlockSigner},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setUnlockSigner",
        args: [
          {type:'string', value: unlockSigner},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
