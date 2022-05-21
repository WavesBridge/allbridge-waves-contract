import {setBridgeAddress} from '../settings/settings';
import {
  displayArgs,
  fromInt,
  getAssetId,
  getBridgeAssetInfo,
  getChainAssetInfo,
  handleInterrupt,
  tokenSourceAndAddressToWavesSource,
  validateAssetId,
  validateHex
} from '../../utils';
import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';

enum GET_ASSET_TYPE {
  ASSET_ID,
  SOURCE,
  WAVES_SOURCE
}

export async function getAssetInfo() {
  const {getAssetType} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'getAssetType',
        message: 'How would you like to get asset info?',
        choices: [
          {name: 'By Asset id', value: GET_ASSET_TYPE.ASSET_ID},
          {name: 'By source and source address', value: GET_ASSET_TYPE.SOURCE},
          {name: 'By waves source (base64)', value: GET_ASSET_TYPE.WAVES_SOURCE},
          '..',
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  switch (getAssetType) {
    case GET_ASSET_TYPE.ASSET_ID:
      return getByAssetId()
    case GET_ASSET_TYPE.SOURCE:
      return getBySource()
    case GET_ASSET_TYPE.WAVES_SOURCE:
      return getByWavesSource()
    default:
      return
  }
}

async function getBySource() {
  try {
    const {tokenSource, tokenSourceAddress} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'tokenSource',
          message: 'Token source (1 to 4 symbols)',
          validate: input => 1 <= input.length && input.length <= 4,
        },
        {
          type: 'input',
          name: 'tokenSourceAddress',
          message: 'Token source address (hex starts with 0x)',
          validate: validateHex
        }
      ])

    const wavesSource = tokenSourceAndAddressToWavesSource(tokenSource, tokenSourceAddress);
    return getByWavesSource(wavesSource);
  } catch (e) {
    handleInterrupt(e)
  }
}

async function getByWavesSource(sourceArg?: string) {
  try {
    const {
      source = sourceArg,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset source and address (base64)',
          when: !sourceArg
        },
      ]);

    const assetId = await getAssetId(source);
    return getByAssetId(assetId);
  } catch (e) {
    handleInterrupt(e)
  }
}

async function getByAssetId(assetIdArg?: string) {
  try {
    await setBridgeAddress(true);
    const {
      assetId = assetIdArg,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'assetId',
          message: 'Asset id',
          validate: validateAssetId,
          when: !assetIdArg
        },
      ]);


    const bridgeAssetInfo = await getBridgeAssetInfo(assetId);
    const chainAssetInfo = await getChainAssetInfo(assetId);
    await displayArgs('Asset info:', [
      {key: 'Asset id', value: chainAssetInfo.assetId},
      {key: 'Name', value: chainAssetInfo.name},
      {key: 'Description', value: chainAssetInfo.description},
      {key: 'Type', value: bridgeAssetInfo.assetType},
      {key: 'Source and address', value: bridgeAssetInfo.assetSourceAndAddress},
      {key: 'Source', value: bridgeAssetInfo.assetSource},
      {key: 'Source address', value: bridgeAssetInfo.assetSourceAddress},
      {key: 'Precision', value: bridgeAssetInfo.precision.toString()},
      {
        key: 'Min fee',
        value: `${fromInt(bridgeAssetInfo.minFee, bridgeAssetInfo.precision)} (${bridgeAssetInfo.minFee})`
      },
      {key: 'Is active', value: bridgeAssetInfo.isActive.toString()},
      {key: 'Total supply', value: fromInt(chainAssetInfo.quantity, chainAssetInfo.decimals).toString()},
    ], false)

  } catch (e) {
    handleInterrupt(e)
  }
}
