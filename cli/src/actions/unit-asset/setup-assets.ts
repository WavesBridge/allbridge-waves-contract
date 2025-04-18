import * as inquirer from 'inquirer';
import {Separator} from 'inquirer';
import {addAsset} from './add-asset';
import {removeAsset} from './remove-asset';
import {handleInterrupt} from '../../utils/utils';
import {setMinFee} from './set-min-fee';
import {setBaseFeeRate} from './set-base-fee-rate';
import {setDisabledFee} from './set-disabled-fee';

enum ASSET_ACTION {
  ADD_ASSET,
  REMOVE_ASSET,
  SET_MIN_FEE,
  SET_BASE_FEE_RATE,
  SET_DISABLED_FEE
}

export async function setupUnitAssets() {
  const {assetAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'assetAction',
        message: 'What do you want to do with asset?',
        choices: [
          {name: 'Add asset', value: ASSET_ACTION.ADD_ASSET},
          {name: 'Remove asset', value: ASSET_ACTION.REMOVE_ASSET},
          {name: 'Set min fee', value: ASSET_ACTION.SET_MIN_FEE},
          {name: 'Set base fee rate', value: ASSET_ACTION.SET_BASE_FEE_RATE},
          '..',
          new Separator()
        ]
      }
    ]).catch(handleInterrupt);

  switch (assetAction) {
    case ASSET_ACTION.ADD_ASSET:
      return await addAsset();
    case ASSET_ACTION.REMOVE_ASSET:
      return await removeAsset();
    case ASSET_ACTION.SET_MIN_FEE:
      return await setMinFee()
    case ASSET_ACTION.SET_BASE_FEE_RATE:
      return setBaseFeeRate()
    case ASSET_ACTION.SET_DISABLED_FEE:
      return setDisabledFee()
    default:
      return
  }
}
