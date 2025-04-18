import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  handleInterrupt,
  toInt
} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {LAST_KEY, Store} from '../../store';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {getChainAssetInfo} from '../../utils/blockchain-utils';
import {validateAssetId} from '../../utils/validators';

export async function setMinFee() {
  try {
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
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
          validate: validateAssetId,
          default: Store.getLastValue(LAST_KEY.ASSET_ID)
        },
        {
          type: 'input',
          name: 'minFeeFloat',
          message: 'Min fee (float)',
          validate: v => !isNaN(v)
        },
      ]);
    Store.setLastValue(LAST_KEY.ASSET_ID, assetId);
    const assetInfo = await getChainAssetInfo(assetId);
    const minFeeInt = toInt(minFeeFloat, assetInfo.decimals);

    await displayArgs('You are going to set asset min fee', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "Asset", value: `${assetId} (${assetInfo.name})`},
      {key: "Min fee", value: `${minFeeFloat} (${minFeeInt})`},
      {key: "Signer", value: signer.address},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
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
