import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {LAST_KEY, Store} from '../../store';
import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  handleInterrupt,
  toInt,
  tokenSourceAndAddressToWavesSource
} from '../../utils/utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import clc from 'cli-color';
import {setupAssets} from './setup-assets';
import {setUnitBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {getChainAssetInfo} from '../../utils/blockchain-utils';
import {validateAssetId, validateBlockchainId, validateHex} from '../../utils/validators';

enum TOKEN_TYPE {
  BASE,
  NATIVE,
  EXIT
}

export async function addAsset() {
  const {tokenType} = await inquirer
    .prompt(
      [{
        type: 'list',
        name: 'tokenType',
        message: 'Select token type',
        choices: [
          {name: `Native ${clc.white('(or previously deployed wrapped)')}`, value: TOKEN_TYPE.NATIVE},
          {name: 'Base', value: TOKEN_TYPE.BASE},
          '..',
          new Separator()
        ]
      }]
    ).catch(handleInterrupt);

  switch (tokenType) {
    case TOKEN_TYPE.BASE:
      return addBaseAsset()
    case TOKEN_TYPE.NATIVE:
      return addNativeAsset()
    default:
      return setupAssets()
  }
}

export async function addNativeAsset(assetIdArg?: string) {
  try {
    const signer = await getCurrentUser();
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
    }
    const {tokenSource, tokenSourceAddress, minFeeFloat, assetId = assetIdArg} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
          validate: validateAssetId,
          when: () => !assetIdArg,
          default: assetIdArg || Store.getLastValue(LAST_KEY.ASSET_ID)
        },
        {
          type: 'input',
          name: 'tokenSource',
          message: 'Token source (1 to 4 symbols)',
          default: Store.getLastValue(LAST_KEY.ASSET_SOURCE),
          validate: validateBlockchainId
        },
        {
          type: 'input',
          name: 'tokenSourceAddress',
          message: 'Token source address (hex starts with 0x)',
          default: Store.getLastValue(LAST_KEY.ASSET_SOURCE_ADDRESS),
          validate: validateHex
        },
        {
          type: 'number',
          name: 'minFeeFloat',
          message: 'Min fee (float)',
          validate: v => !isNaN(v)
        }
      ]);
    Store.setLastValue(LAST_KEY.ASSET_SOURCE, tokenSource);
    Store.setLastValue(LAST_KEY.ASSET_SOURCE_ADDRESS, tokenSourceAddress);

    const assetInfo = await getChainAssetInfo(assetId);

    const assetSourceAndAddress = tokenSourceAndAddressToWavesSource(tokenSource, tokenSourceAddress)
    const minFeeInt = Math.floor(minFeeFloat * Math.pow(10, assetInfo.decimals));

    const assetIdB64 = base58ToBase64(assetId);
    await displayArgs('You are going to issue new native token', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Unit bridge", value: Store.unitBridgeAddress},
      {key: "Token name", value: assetInfo.name},
      {key: "Token description", value: assetInfo.description},
      {key: "Token precision", value: assetInfo.decimals},
      {key: "Token source", value: tokenSource},
      {key: "Token source address", value: tokenSourceAddress},
      {key: "Token source and address", value: assetSourceAndAddress},
      {key: "Token min fee", value: `${minFeeFloat} (${minFeeInt})`},
      {key: "Asset id", value: `${assetId} (${assetIdB64})`},
      {key: "Signer", value: signer.address},
    ])

    const addAssetParams: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: 'addAsset', args: [
          {type: 'binary', value: assetSourceAndAddress},
          {type: 'binary', value: assetIdB64},
          {type: 'integer', value: minFeeInt}
        ]
      }
    }

    await sendInvokeScript(addAssetParams);
  } catch (e) {
    handleInterrupt(e);
  }
}

async function addBaseAsset() {
  try {
    const signer = await getCurrentUser();
    if (!Store.unitBridgeAddress) {
      await setUnitBridgeAddress()
    }
    const {minFeeFloat} = await inquirer
      .prompt([
        {
          type: 'number',
          name: 'minFeeFloat',
          message: 'Min fee (float)',
          validate: v => !isNaN(v)
        }
      ]);
    const minFeeInt = toInt(minFeeFloat, 8);
    const assetSource = 'V0FWRVdBVkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const assetId = 'V0FWRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';

    const params: IInvokeScriptParams = {
      dApp: Store.unitBridgeAddress,
      call: {
        function: 'addAsset',
        args: [
          {type: 'binary', value: assetSource},
          {type: 'binary', value: assetId},
          {type: 'integer', value: minFeeInt}
        ]
      }
    }

    await displayArgs('You are going to add base WAVES token', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.unitBridgeAddress},
      {key: "Token min fee", value: `${minFeeFloat} (${minFeeInt})`},
      {key: "Signer", value: signer.address},
    ])

    await sendInvokeScript(params)
    Store.setLastValue(LAST_KEY.ASSET_ID, '6scFjhFGDfpmYySMKQ9vDbZuH8aMRWsUQJAHXzm1FsJo')
  } catch (e) {
    handleInterrupt(e);
  }
}

