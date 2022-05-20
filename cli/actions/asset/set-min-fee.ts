import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  getAssetInfo,
  getCurrentUser,
  handleInterrupt,
  sendInvokeScript,
  toInt
} from '../../utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';

export async function setMinFee() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      assetId,
      minFeeFloat,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
        },
        {
          type: 'input',
          name: 'minFeeFloat',
          message: 'Min fee (float)',
        },
      ]);
    const assetInfo = await getAssetInfo(assetId);
    const minFeeInt = toInt(minFeeFloat, assetInfo.decimals);

    await displayArgs('You are going to set asset min fee', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Asset", value: `${assetId} (${assetInfo.name})`},
      {key: "Min fee", value: `${minFeeFloat} (${minFeeInt})`},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setMinFee",
        args: [
          {type: 'binary', value: base58ToBase64(assetId)},
          {type: 'integer', value: minFeeInt},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
