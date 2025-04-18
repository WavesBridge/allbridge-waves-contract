import {chainIdToName, displayArgs, handleInterrupt,} from '../../utils/utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {Store} from '../../store';
import * as inquirer from 'inquirer';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress} from '../../utils/validators';

export async function initBridge() {
  try {
    await setUnitBridgeAddress(true)
    const user = await getCurrentUser();
    const {
      admin,
      feeCollector,
      unitBridgeAddress,
      baseFeeRate
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'admin',
          message: 'Bridge admin address',
          validate: validateAddress
        },
        {
          type: 'input',
          name: 'feeCollector',
          message: 'Fee collector address',
          validate: validateAddress
        },
        {
          type: 'input',
          name: 'unitBridgeAddress',
          message: 'Unit0 contract address to proxy',
          validate: validateAddress
        },
        {
          type: 'number',
          name: 'baseFeeRate',
          message: 'Base fee rate %'
        }
      ]);
    const baseFeeRateBp = Math.floor(baseFeeRate * 100);

    await displayArgs('You are going to init bridge', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Proxy bridge address", value: Store.unitBridgeAddress},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Bridge admin", value: admin},
      {key: "Fee collector address", value: feeCollector},
      {key: "Unit contract address to proxy", value: unitBridgeAddress},
      {key: "Base fee rate", value: `${baseFeeRate}% (${baseFeeRateBp})`},
      {key: "Signer", value: user.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: 'init',
        args: [{type: 'string', value: admin},
          {type: 'string', value: unitBridgeAddress},
          {type: 'string', value: feeCollector},
          {type: 'integer', value: baseFeeRateBp}],
      }
    }

    await sendInvokeScript(params)
  } catch (e) {
    handleInterrupt(e);
  }
}
