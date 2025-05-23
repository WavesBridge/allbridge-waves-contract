import {
  chainIdToName,
  displayArgs,
  handleInterrupt,
  hexToBase64,
} from '../../utils/utils';
import {IInvokeScriptParams} from '@waves/waves-transactions/src/transactions';
import {Store} from '../../store';
import * as inquirer from 'inquirer';
import {setBridgeAddress, setValidatorAddress} from '../settings/settings';
import {sendInvokeScript} from '../../utils/send-utils';
import {validateAddress, validateOracle} from '../../utils/validators';

export async function initValidator() {
  try {
    if (!Store.validatorAddress) {
      await setValidatorAddress()
    }
    if (!Store.bridgeAddress) {
      await setBridgeAddress()
    }
    const {
      adminAddress,
      oraclePublicKey,
      validatorVersion
    } = await inquirer
      .prompt([
        {
          type: 'input',
          name: 'adminAddress',
          message: 'Validator admin address',
          validate: validateAddress
        },
        {
          type: 'input',
          name: 'oraclePublicKey',
          message: 'Full oracle public key (hex)',
          validate: validateOracle
        },
        {
          type: 'number',
          name: 'validatorVersion',
          message: 'Validator version',
          default: 1,
          validate: (input: number) => Number.isInteger(input) && 1 <= input && input <= 255
        }
      ]);

    await displayArgs('You are going to init validator', [
      {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
      {key: "Bridge", value: Store.bridgeAddress},
      {key: "Validator", value: Store.validatorAddress},
      {key: "Admin address", value: adminAddress},
      {key: "Oracle public key", value: oraclePublicKey},
      {key: "Validator version", value: validatorVersion},
    ])

    const params: IInvokeScriptParams = {
      dApp: Store.validatorAddress,
      call: {
        function: 'init',
        args: [
          {type: 'string', value: adminAddress},
          {type: 'binary', value: Buffer.from([validatorVersion]).toString('base64')},
          {type: 'string', value: Store.bridgeAddress},
          {type: 'binary', value: hexToBase64(oraclePublicKey)}]
      }
    }

    await sendInvokeScript(params)
  } catch (e) {
    handleInterrupt(e);
  }
}
