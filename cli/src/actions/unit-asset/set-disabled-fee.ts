import {base58ToBase64, chainIdToName, displayArgs, handleInterrupt} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {LAST_KEY, Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {getChainAssetInfo} from '../../utils/blockchain-utils';
import {validateAssetId} from '../../utils/validators';

export async function setDisabledFee() {
  try {
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {
      assetId,
      isDisabledFee,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
          validate: validateAssetId,
          default: Store.getLastValue(LAST_KEY.ASSET_ID)
        },
        {
          type: 'input',
          name: 'isDisabledFee',
          message: 'Is disabled fee (true/false)',
          validate: v => v === 'true' || v === 'false',
          default: 'true'
        },
      ]);
    Store.setLastValue(LAST_KEY.ASSET_ID, assetId);
    const assetInfo = await getChainAssetInfo(assetId);

    await displayArgs('You are going to set asset min fee', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "Asset", value: `${assetId} (${assetInfo.name})`},
      {key: "Disable fee", value: isDisabledFee === 'true' ? 'yes' : 'no'},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: "setDisabledFee",
        args: [
          {type: 'binary', value: base58ToBase64(assetId)},
          {type: 'boolean', value: isDisabledFee === 'true'},
        ]
      }
    }

    await sendInvokeScript(params);
  } catch (e) {
    handleInterrupt(e)
  }
}
