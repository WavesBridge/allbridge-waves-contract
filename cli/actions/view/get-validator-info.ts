import {setBridgeAddress, setValidatorAddress} from '../settings/settings';
import {
  displayArgs,
  fromInt, getAssetId,
  getBridgeAssetInfo,
  getChainAssetInfo, getLockInfo, getRawBridgeInfo, getRawValidatorInfo,
  handleInterrupt, tokenSourceAndAddressToWavesSource,
  validateAssetId, validateHex
} from '../../utils';
import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';

export async function getValidatorInfo() {
  try {
    await setValidatorAddress(true);

    const rawValidatorInfo = await getRawValidatorInfo();

    await displayArgs('Bridge info:', [
      {key: 'Validator version', value: rawValidatorInfo.version.toString()},
      {key: 'Admin', value: rawValidatorInfo.admin},
      {key: 'Oracle', value: rawValidatorInfo.oracle},
      {key: 'Bridge', value: rawValidatorInfo.bridge},
    ], false)

  } catch (e) {
    handleInterrupt(e)
  }
}
