import * as inquirer from 'inquirer';
import {broadcast, invokeScript} from '@waves/waves-transactions';
import {Store} from '../../store';
import {
  base58ToBase64,
  chainIdToName,
  displayArgs, getAssetInfo, handleInterrupt,
  sendInvokeScript,
  tokenSourceAndAddressToWavesSource
} from '../../utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import clc from 'cli-color';
import {Separator} from 'inquirer';
import {setupAssets} from './setup-assets';

enum TOKEN_TYPE {
  BASE,
  WRAPPED,
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
          {name: 'Wrapped', value: TOKEN_TYPE.BASE},
          {name: `Native ${clc.white('(or previously deployed wrapped)')}`, value: TOKEN_TYPE.NATIVE},
          {name: 'Base', value: TOKEN_TYPE.BASE},
          {name: '..', value: TOKEN_TYPE.EXIT},
          new Separator()
        ]
      }]
    ).catch(handleInterrupt);

  switch (tokenType) {
    case TOKEN_TYPE.BASE:
      return addBaseAsset()
    case TOKEN_TYPE.WRAPPED:
      return addWrappedAsset()
    case TOKEN_TYPE.NATIVE:
      return addNativeAsset()
    default:
      return setupAssets()
  }
}

export async function addWrappedAsset() {
  try {
    const {tokenName, tokenDescription, precision} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'tokenName',
          message: 'Token name (Symbol) (From 4 to 16 bytes, 1 character can take up to 4 bytes)',
        },
        {
          type: 'input',
          name: 'tokenDescription',
          message: 'Token description (Up to 1000 bytes)',
          default: ''
        },
        {
          type: 'number',
          name: 'precision',
          message: 'Token precision (Number of decimal places, from 0 to 8)',
          default: 8
        }
      ]);

    const issueParams: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: "issue",
        args: [
          {type: 'string', value: tokenName},
          {type: 'string', value: tokenDescription || ''},
          {type: 'integer', value: precision},
        ]
      },
      fee: "100500000"
    }

    await displayArgs('You are going to issue new wrapped token', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Token name", value: tokenName},
      {key: "Token description", value: tokenDescription},
      {key: "Token precision", value: precision},
    ])

    const issueTsResult = await sendInvokeScript(issueParams);

    const assetId = issueTsResult.stateChanges.issues[0].assetId;
    console.log(clc.green('New asset is added'), assetId)
    return addNativeAsset(assetId);
  } catch (e) {
    handleInterrupt(e)
  }
}

export async function addNativeAsset(assetIdArg?: string) {
  try {
    const {tokenSource, tokenSourceAddress, minFeeFloat, assetId = assetIdArg} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
          when: () => !assetIdArg,
          default: assetIdArg
        },
        {
          type: 'input',
          name: 'tokenSource',
          message: 'Token source (1 to 4 symbols)',
        },
        {
          type: 'input',
          name: 'tokenSourceAddress',
          message: 'Token source address (hex starts with 0x)',
        },
        {
          type: 'number',
          name: 'minFeeFloat',
          message: 'Min fee (float)',
        }
      ]);

    const assetInfo = await getAssetInfo(assetId);

    const assetSourceAndAddress = tokenSourceAndAddressToWavesSource(tokenSource, tokenSourceAddress)
    const minFeeInt = Math.floor(minFeeFloat * Math.pow(10, assetInfo.decimals));

    const assetIdB64 = base58ToBase64(assetId);
    await displayArgs('You are going to issue new wrapped token', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Token name", value: assetInfo.name},
      {key: "Token description", value: assetInfo.description},
      {key: "Token precision", value: assetInfo.decimals},
      {key: "Token source", value: tokenSource},
      {key: "Token source address", value: tokenSourceAddress},
      {key: "Token source and address", value: assetSourceAndAddress},
      {key: "Token in fee", value: `${minFeeFloat} (${minFeeInt})`},
      {key: "Asset id", value: `${assetId} (${assetIdB64})`},
    ])

    const addAssetParams: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
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
    const {minFee} = await inquirer
      .prompt([
        {
          type: 'number',
          name: 'minFee',
          message: 'Specify asset min fee'
        }
      ]);
    const minFeeInt = Math.floor(minFee * 1e8);
    const assetSource = 'V0FWRVdBVkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const assetId = 'V0FWRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
    const signedTx = invokeScript({
      dApp: Store.bridgeAddress,
      call: {
        function: 'addAsset',
        args: [
          {type: 'binary', value: assetSource},
          {type: 'binary', value: assetId},
          {type: 'integer', value: minFeeInt}
        ]
      },
      chainId: Store.node.chainId
    }, Store.seed);
    const result = await broadcast(signedTx, Store.node.address).catch(console.error)
    console.log(result);
  } catch (e) {
    handleInterrupt(e);
  }
}

