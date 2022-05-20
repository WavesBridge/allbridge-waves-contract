import {chainIdToName, displayArgs, getCurrentUser, handleInterrupt, sendSetScript} from '../../utils';
import {Store} from '../../store';

const ride = require('@waves/ride-js')
const fs = require('fs');

const code = fs.readFileSync('../ride/validator.ride', 'utf8');
const data = ride.compile(code).result.base64;

export async function deployValidator() {
    try {
        const signer = await getCurrentUser();

        const txData = {
            script: data,
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
