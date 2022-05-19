import * as inquirer from 'inquirer';
import {broadcast, invokeScript} from '@waves/waves-transactions';
import {Store} from '../../config/store';
import {base58ToBase64} from '../../utils';

export async function removeAsset() {
  const {assetSource, newOwner} = await inquirer
    .prompt([
      {
        type: 'input',
        name: 'assetSource',
        message: 'Write asset source (source blockchain id and sours address as base64)',
      },
      {
        type: 'input',
        name: 'newOwner',
        message: 'Write new owner address',
      }
    ]);
  const signedTx = invokeScript({
    dApp: Store.bridgeAddress,
    call: {
      function: 'removeAsset',
      args: [
        {type: 'binary', value: assetSource},
        {type: 'binary', value: base58ToBase64(newOwner)},
      ]
    },
    chainId: Store.node.chainId
  }, Store.seed);
  const result = await broadcast(signedTx, Store.node.address).catch(console.error)
  console.log(result);

}
