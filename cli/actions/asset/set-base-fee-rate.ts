import {chainIdToName, displayArgs, handleInterrupt} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';

export async function setBaseFeeRate() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      baseFeeRate
    } = await inquirer
      .prompt([
        {
          type: 'number',
          name: 'baseFeeRate',
          message: 'Base fee rate %'
        }
      ]);
    const baseFeeRateBp = Math.floor(baseFeeRate * 100);

    await displayArgs('You are going to set base fee rate', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Base fee rate", value: `${baseFeeRate}% (${baseFeeRateBp})`},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setBaseFeeRate",
        args: [
          {type: 'integer', value: baseFeeRateBp},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
