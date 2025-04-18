import {chainIdToName, displayArgs, handleInterrupt} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {getRawBridgeInfo} from '../../utils/blockchain-utils';

export async function setBaseFeeRate() {
  try {
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
    }
    const signer = await getCurrentUser();
    const bridgeInfo = await getRawBridgeInfo();
    const {
      baseFeeRate
    } = await inquirer
      .prompt([
        {
          type: 'number',
          name: 'baseFeeRate',
          message: 'Base fee rate %',
          default: bridgeInfo.baseFeeRateBP / 100
        }
      ]);
    const baseFeeRateBp = Math.floor(baseFeeRate * 100);

    await displayArgs('You are going to set base fee rate', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "Base fee rate", value: `${baseFeeRate}% (${baseFeeRateBp})`},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
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
