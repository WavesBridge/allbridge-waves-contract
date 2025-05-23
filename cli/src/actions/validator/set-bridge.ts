import {
  chainIdToName,
  displayArgs,
  handleInterrupt,
} from '../../utils/utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress, setValidatorAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';

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
        function: "setBridge",
        args: [
          {type:'string', value: Store.bridgeAddress},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
