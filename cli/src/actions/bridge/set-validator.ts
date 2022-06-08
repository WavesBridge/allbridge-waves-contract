import {
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

    await displayArgs('You are going to set bridge validator (You can change validator address in settings)', [
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
          {type:'string', value: Store.validatorAddress},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
