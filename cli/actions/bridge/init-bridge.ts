import {base58ToBase64, chainIdToName, displayArgs, handleInterrupt, sendInvokeScript} from '../../utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {Store} from '../../store';
import * as inquirer from 'inquirer';

export async function initBridge() {
  try {
    const {
      bridgeManager,
      feeCollector,
      unlockSigner,
      baseFeeRate
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'bridgeManager',
          message: 'Bridge manager address',
        },
        {
          type: 'input',
          name: 'feeCollector',
          message: 'Fee collector address',
        },
        {
          type: 'input',
          name: 'unlockSigner',
          message: 'Unlock signer address',
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
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Bridge manager", value: bridgeManager},
      {key: "Fee collector address", value: feeCollector},
      {key: "Unlock signer precision", value: unlockSigner},
      {key: "Base fee rate", value: `${unlockSigner}% (${baseFeeRateBp})`},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: 'init',
        args: [{type: 'binary', value: base58ToBase64(bridgeManager)},
          {type: 'binary', value: base58ToBase64(Store.validatorAddress)},
          {type: 'binary', value: base58ToBase64(feeCollector)},
          {type: 'binary', value: base58ToBase64(unlockSigner)},
          {type: 'integer', value: baseFeeRateBp}],
      }
    }

    await sendInvokeScript(params)
  } catch (e) {
    handleInterrupt(e);
  }
}
