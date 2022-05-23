import {chainIdToName, displayArgs, handleInterrupt} from '../../utils/utils';
import {Store} from '../../store';
import {getCurrentUser, sendSetScript} from '../../utils/send-utils';
import path from 'path';
import clc from 'cli-color';

const ride = require('@waves/ride-js')
const fs = require('fs');

const code = fs.readFileSync(path.resolve(__dirname, '../../../../ride/validator.ride'), 'utf8');

const data = ride.compile(code);

export async function deployValidator() {
    try {
        if (data.error) {
            console.log(clc.red('Contract has error:'), data.error);
            return;
        }
        const signer = await getCurrentUser();

        const txData = {
            script: data.result.base64,
        };

        await displayArgs('You are going to deploy validator contract. If you want to change contract address, auth with another account', [
            {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
            {key: "Validator address", value: signer.address},
        ])
        const result = await sendSetScript(txData);

        Store.validatorAddress = result?.sender;
    } catch (e) {
        handleInterrupt(e)
    }
}
