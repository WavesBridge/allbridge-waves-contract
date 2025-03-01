import {setBridgeAddress} from '../settings/settings';
import {
  displayArgs,
  handleInterrupt
} from '../../utils/utils';
import * as inquirer from 'inquirer';
import {getAssetId, getBridgeAssetInfo, getChainAssetInfo, getLockInfo} from '../../utils/blockchain-utils';
import {validateLockId} from '../../utils/validators';

export async function getLock() {
  try {
    await setBridgeAddress(true);
    const {
      lockId,
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'lockId',
          message: 'Lock id',
          validate: validateLockId
        },
      ]);

    const lockInfo = await getLockInfo(lockId);
    const assetId = await getAssetId(lockInfo.assetSourceAndAddress);
    const bridgeAssetInfo = await getBridgeAssetInfo(assetId);
    const chainAssetInfo = await getChainAssetInfo(assetId);

    await displayArgs('Lock info:', [
      {key: 'Asset id', value: chainAssetInfo.assetId},
      {key: 'Lock id', value: lockId},
      {key: 'Amount', value: `${lockInfo.amount} ${chainAssetInfo.name}`},
      {key: 'Destination', value: lockInfo.destination},
      {key: 'Recipient', value: lockInfo.recipient},
      {key: 'Name', value: chainAssetInfo.name},
      {key: 'Description', value: chainAssetInfo.description},
      {key: 'Source and address', value: bridgeAssetInfo.assetSourceAndAddress},
      {key: 'Source', value: bridgeAssetInfo.assetSource},
      {key: 'Source address', value: bridgeAssetInfo.assetSourceAddress},
    ], false)

  } catch (e) {
    handleInterrupt(e)
  }
}
