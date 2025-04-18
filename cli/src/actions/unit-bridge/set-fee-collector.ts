import {
  chainIdToName,
  displayArgs,
  handleInterrupt,
} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress} from '../../utils/validators';

export async function setFeeCollector() {
  try {
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      feeCollector
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'feeCollector',
          message: 'Fee collector address',
          validate: validateAddress
        }
      ]);

    await displayArgs('You are going to set bridge fee collector address', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "Fee collector", value: feeCollector},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: "setFeeCollector",
        args: [
          {type:'string', value: feeCollector},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
