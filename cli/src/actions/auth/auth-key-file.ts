import inquirer from 'inquirer';
import fs from 'fs';
import * as Waves from '@waves/waves-transactions';
import {seedUtils} from '@waves/waves-transactions';
import {Store} from '../../store';
import path from 'path';
import {setNetwork} from '../settings/settings';


export async function authKeyFile(fast = false) {
  if (!Store.node) {
    await setNetwork()
  }
  if (!fast || !Store.keyFile) {
    const {keyFile} = await inquirer
      .prompt([
        {
          type: 'file-tree-selection',
          name: 'keyFile',
          message: 'Select a waves account key file',
          enableGoUpperDirectory: true,
          onlyShowValid: true,
          validate(input) {
            return (fs.lstatSync(input).isDirectory() || input.endsWith('.json')) && !(/(^|\/)\.[^\/.]/g).test(input);
          },
          default: Store.keyFile,
          root: Store.keyFile ? path.dirname(Store.keyFile) : undefined
        }
      ]);
    if (!keyFile.endsWith('.json')) {
      console.log('Invalid file, select another')
      return authKeyFile()
    }
    Store.keyFile = keyFile;
  }

  try {
    const fileData = JSON.parse(fs.readFileSync(Store.keyFile, 'utf8'));
    if (!fileData.profiles) {
      console.log('Invalid key file format');
      return authKeyFile();
    }
    return decryptKey(fileData.profiles, fast)
  } catch (e) {
    console.log('Cannot read data from the key file');
    return authKeyFile();
  }
}

async function decryptKey(data: string, fast = false) {
  const {password} = await inquirer
    .prompt([
      {
        type: 'password',
        name: 'password',
        message: 'Write a password for the account key file',
        validate(password) {
          try {
            Waves.seedUtils.decryptSeed(Buffer.from(data, 'base64').toString(), password);
            return true
          } catch (e) {
            return 'Wrong password'
          }
        }
      }
    ]);
  const accounts = Waves.seedUtils.decryptSeed(Buffer.from(data, 'base64').toString(), password);
  return selectAccount(JSON.parse(accounts), fast)
}

async function selectAccount(accounts: any, fast = false) {
  const list = [];
  for (const key in accounts) {
    for (const account of accounts[key].accounts) {
      if (fast && Store.keyFileAddress && account.address === Store.keyFileAddress) {
        Store.seed = account.seed;
        Store.useLedger = false;
        return;
      }
      list.push({
        name: `${account.address} ${account.name} (${key})`,
        value: account.seed,
        default: Store.seed,
      })
    }
  }

  const {seed} = await inquirer
    .prompt([
      {
        type: 'list',
        name: 'seed',
        message: 'Select an account you want to use',
        choices: list
      }
    ]);

  const wavesSeed = new seedUtils.Seed(seed, String.fromCharCode(Store.node.chainId));
  Store.seed = seed;
  Store.useLedger = false;
  Store.keyFileAddress = wavesSeed.address;
}
