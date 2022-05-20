import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  getCurrentUser,
  handleInterrupt,
  sendInvokeScript
} from '../../utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress, setValidatorAddress} from '../settings/settings';

export async function setValidatorBridge() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    if (!Store.validatorAddress) {
      await setValidatorAddress()
    }
    const signer = await getCurrentUser();

    await displayArgs('You are going to set bridge address', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.validatorAddress,
      call: {
        function: "setAdmin",
        args: [
          {type:'binary', value: base58ToBase64(Store.bridgeAddress)},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
