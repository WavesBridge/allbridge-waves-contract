import {setBridgeAddress} from '../settings/settings';
import {displayArgs, handleInterrupt} from '../../utils/utils';
import {getRawBridgeInfo} from '../../utils/blockchain-utils';

export async function getBridgeInfo() {
  try {
    await setBridgeAddress(true);

    const rawBridgeInfo = await getRawBridgeInfo();

    await displayArgs('Bridge info:', [
      {key: 'Is active', value: rawBridgeInfo.isActive.toString()},
      {key: 'Base fee rate', value: `${rawBridgeInfo.baseFeeRateBP / 100}%`},
      {key: 'Validator', value: rawBridgeInfo.validator},
      {key: 'Fee collector', value: rawBridgeInfo.feeCollector},
      {key: 'Unlock signer', value: rawBridgeInfo.unlockSigner},
      {key: 'Bridge manager', value: rawBridgeInfo.bridgeManager},
      {key: 'Asset manager', value: rawBridgeInfo.assetManager},
      {key: 'Stop manager', value: rawBridgeInfo.stopManager},
    ], false)

  } catch (e) {
    handleInterrupt(e)
  }
}
