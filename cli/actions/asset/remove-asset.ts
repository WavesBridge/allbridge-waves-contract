import * as inquirer from 'inquirer';
import {broadcast, invokeScript} from '@waves/waves-transactions';
import {Store} from '../../store';
import {
  base58ToBase64,
  chainIdToName,
  displayArgs,
  getCurrentUser,
  handleInterrupt,
  tokenSourceAndAddressToWavesSource,
  validateAddress,
  validateHex
} from '../../utils';
import {setBridgeAddress} from '../settings/settings';

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
          validate: input => 1 <= input.length && input.length <= 4,
        },
        {
          type: 'input',
          name: 'tokenSourceAddress',
          message: 'Token source address (hex starts with 0x)',
          validate: validateHex
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
      {key: "Token description", value: tokenSourceAddress},
      {key: "Token source and address", value: assetSourceAndAddress},
      {key: "Signer", value: signer.address},
    ])


    const signedTx = invokeScript({
      dApp: Store.bridgeAddress,
      call: {
        function: 'removeAsset',
        args: [
          {type: 'binary', value: assetSourceAndAddress},
          {type: 'binary', value: base58ToBase64(newOwner)},
        ]
      },
      chainId: Store.node.chainId
    }, Store.seed);
    const result = await broadcast(signedTx, Store.node.address).catch(console.error)
    console.log(result);

  } catch (e) {
    handleInterrupt(e)
  }
}
