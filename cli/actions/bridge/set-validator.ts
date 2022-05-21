import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  handleInterrupt,
} from '../../utils/utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress, setValidatorAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';

export async function setValidator() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    if (!Store.validatorAddress) {
      await setValidatorAddress()
    }
    const signer = await getCurrentUser();

    await displayArgs('You are going to set bridge validator', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setValidator",
        args: [
          {type:'binary', value: base58ToBase64(Store.validatorAddress)},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
