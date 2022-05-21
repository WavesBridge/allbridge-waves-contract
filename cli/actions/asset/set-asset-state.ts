import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  getChainAssetInfo,
  getCurrentUser,
  handleInterrupt,
  sendInvokeScript,
  validateAssetId
} from '../../utils';
import * as inquirer from 'inquirer';
import {Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setBridgeAddress} from '../settings/settings';

export async function setAssetState() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      assetId,
      state,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
          validate: validateAssetId
        },
        {
          type: 'list',
          name: 'state',
          message: 'Select asset state',
          choices: [{name: 'Enable', value: true},
            {name: 'Disable', value: false}]
        },
      ]);
    const assetInfo = await getChainAssetInfo(assetId);

    await displayArgs('You are going to set asset state', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Asset", value: `${assetId} (${assetInfo.name})`},
      {key: "Enabled", value: state},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "setAssetState",
        args: [
          {type: 'binary', value: base58ToBase64(assetId)},
          {type: 'boolean', value: state},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
