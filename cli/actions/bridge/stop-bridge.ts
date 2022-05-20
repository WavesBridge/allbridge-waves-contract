import {chainIdToName, displayArgs, getCurrentUser, handleInterrupt, sendInvokeScript} from '../../utils';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';

export async function stopBridge() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();

    await displayArgs('You are going to stop bridge', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "stopBridge",
        args: []
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
