import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  getCurrentUser,
  handleInterrupt,
  sendInvokeScript, validateAssetId
} from '../../utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';

export async function setFeeCollector() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
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
          validate: validateAssetId
        }
      ]);

    await displayArgs('You are going to set bridge fee collector address', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Fee collector", value: feeCollector},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setFeeCollector",
        args: [
          {type:'binary', value: base58ToBase64(feeCollector)},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
