import * as inquirer from 'inquirer';
import {broadcast, invokeScript} from '@waves/waves-transactions';
import {Store} from '../../config/store';

export async function addAsset() {
  const {tokenType} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'tokenType',
        message: 'Select token type',
        choices: ['Wrapped', 'Native', 'Base']
      }
    ]);
  switch (tokenType) {
    case 'Base':
      return addBaseAsset()
  }
}

async function addBaseAsset() {
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
}

