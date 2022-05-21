import {setValidatorAddress} from '../settings/settings';
import {displayArgs, getRawValidatorInfo, handleInterrupt} from '../../utils';

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
