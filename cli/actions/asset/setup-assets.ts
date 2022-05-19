import * as inquirer from 'inquirer';
import {addAsset} from './add-asset';
import {removeAsset} from './remove-asset';

export async function setupAssets() {
  const {assetAction} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'assetAction',
        message: 'What do you want to do with asset?',
        choices: ['Add asset', 'Remove asset', 'Set min fee', 'Set base fee rate', 'Set asset state', '..']
      }
    ]).catch(() => '..');

  switch (assetAction) {
    case 'Add asset':
      return await addAsset();
    case 'Remove asset':
      return await removeAsset();
    default:
      return
  }
}
