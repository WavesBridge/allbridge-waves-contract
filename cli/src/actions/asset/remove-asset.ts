import * as inquirer from 'inquirer';
import {LAST_KEY, Store} from '../../store';
import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  handleInterrupt,
  tokenSourceAndAddressToWavesSource,
} from '../../utils/utils';
import {setBridgeAddress} from '../settings/settings';
import {getCurrentUser, sendInvokeScript} from '../../utils/send-utils';
import {validateAddress, validateBlockchainId, validateHex} from '../../utils/validators';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';

export async function removeAsset() {
  try {
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const signer = await getCurrentUser();
    const {tokenSource, tokenSourceAddress, newOwner} = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'tokenSource',
          message: 'Token source (1 to 4 symbols)',
          validate: validateBlockchainId,
          default: Store.getLastValue(LAST_KEY.ASSET_SOURCE)
        },
        {
          type: 'input',
          name: 'tokenSourceAddress',
          message: 'Token source address (hex starts with 0x)',
          validate: validateHex,
          default: Store.getLastValue(LAST_KEY.ASSET_SOURCE_ADDRESS)
        },
        {
          type: 'input',
          name: 'newOwner',
          message: 'Write new owner address',
          validate: validateAddress
        }
      ]);

    const assetSourceAndAddress = tokenSourceAndAddressToWavesSource(tokenSource, tokenSourceAddress)

    await displayArgs('You are going to remove asset', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Token source", value: tokenSource},
      {key: "Token source address", value: tokenSourceAddress},
      {key: "Token source and address", value: assetSourceAndAddress},
      {key: "Signer", value: signer.address},
    ])


    const params: IInvokeScriptParams = {
      dApp: Store.bridgeAddress,
      call: {
        function: 'removeAsset',
        args: [
          {type: 'binary', value: assetSourceAndAddress},
          {type: 'string', value: newOwner},
        ]
      },
    };
    await sendInvokeScript(params)

  } catch (e) {
    handleInterrupt(e)
  }
}
