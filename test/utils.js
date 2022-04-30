function accountSeedToBase64(accountSeed) {
    return base58ToBase64(address(accountSeed));
}

function base58ToBase64(value) {
    return base64Encode(base58Decode(value)); 
}

function toWavelet(amount) {
    return Math.floor(amount * 1e8)
}

async function broadcastAndWait(tx) {
    await broadcast(tx);
    return await waitForTx(tx.id);
}

async function initValidatorContract(oraclePublicKey) {
    const script = compile(file('validator.ride'));
    const deployTx = setScript({script}, accounts.validator);
    await broadcastAndWait(deployTx);

    const initTx = await invoke({
        dApp: address(accounts.validator),
        functionName: 'setConfig',
        arguments: [[1], {type:'binary', value: accountSeedToBase64(accounts.bridge)}, 
                        {type:'binary', value: oraclePublicKey}]
    }, accounts.admin);
    await waitForTx(initTx.id);
}

async function initBridgeContract() {
    const script = compile(file('bridge.ride'));
    const deployTx = setScript({script}, accounts.bridge);
    await broadcastAndWait(deployTx);

    const initTx = await invoke({
        dApp: address(accounts.bridge),
        functionName: "setConfig", 
        arguments: [{type:'binary', value: accountSeedToBase64(accounts.admin)}, 
                    {type:'binary', value: accountSeedToBase64(accounts.validator)}],
    }, accounts.admin)
    await waitForTx(initTx.id);
}

module.exports = {
    accountSeedToBase64,
    toWavelet,
    broadcastAndWait,
    base58ToBase64,
    initValidatorContract,
    initBridgeContract
}