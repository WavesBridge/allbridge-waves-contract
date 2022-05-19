import {chainIdToName, displayArgs, getCurrentUser, sendSetScript} from '../../utils';
import {Store} from '../../config/store';

const ride = require('@waves/ride-js')
const fs = require('fs');

const code = fs.readFileSync('../ride/bridge.ride', 'utf8');
const data = ride.compile(code).result.base64;

export async function deployBridge() {
    const signer = await getCurrentUser();

    const txData = {
        script: data,
    };

    const isReady = displayArgs('You are going to deploy bridge contract. If you want to change contract address, auth with another account', [
        {key: "Node", value: `${Store.node.address} (${chainIdToName(Store.node.chainId)})`},
        {key: "Bridge address", value: signer.address},
    ])

    if (!isReady) {
        return;
    }
    const result = await sendSetScript(txData);

    Store.bridgeAddress = result?.sender;
}
