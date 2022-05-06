const BN = require('bn.js')

function accountSeedToBase64(accountSeed) {
    return base58ToBase64(address(accountSeed));
}

function base64ToHex(value) {
    return base64ToBuffer(value).toString('hex');
}

function base64ToString(value) {
    return base64ToBuffer(value).toString();
}

function base64ToBuffer(value) {
    return Buffer.from(base64Normalize(value), 'base64');
}

function base64Normalize(value) {
    return value.replace('base64:', '');
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
                    {type:'binary', value: accountSeedToBase64(accounts.validator)},
                    {type:'binary', value: accountSeedToBase64(accounts.feeCollector)},
                    {type:'binary', value: accountSeedToBase64(accounts.unclokSigner)},
                    {type:'integer', value: 30}],
    }, accounts.admin)
    await waitForTx(initTx.id);
}

async function getLockData(lockId) {
    const lockIdStr = lockId.toString('base64');
    
    let lockRecipient = await accountDataByKey(`${lockIdStr}_lr`, address(accounts.validator));
    let lockAmount = await accountDataByKey(`${lockIdStr}_la`, address(accounts.validator));
    let lockDestination = await accountDataByKey(`${lockIdStr}_ld`, address(accounts.validator));
    let lockAssetSource = await accountDataByKey(`${lockIdStr}_las`, address(accounts.validator));
    
    return {
        recipient: base64ToHex(lockRecipient.value),
        amount: lockAmount.value,
        destination: base64ToString(lockDestination.value),
        assetSource: base64ToString(lockAssetSource.value),
    }
}

async function getTokenInfo(assetIdStr) {
    let recordNative = await accountDataByKey(`${assetIdStr}_aa`, address(accounts.bridge));
    let recordType = await accountDataByKey(`${assetIdStr}_at`, address(accounts.bridge));
    let recordPrecision = await accountDataByKey(`${assetIdStr}_ap`, address(accounts.bridge));
    let recordMinFee = await accountDataByKey(`${assetIdStr}_amf`, address(accounts.bridge));

    return {
        source: recordNative ? base64Normalize(recordNative.value) : null,
        type: recordType ? recordType.value : null,
        precision: recordPrecision ? recordPrecision.value : null,
        minFee: recordMinFee ? recordMinFee.value : null

    }
}

async function getAssetId(source) {
    let recordSource = await accountDataByKey(`${source}_aa`, address(accounts.bridge));
    return recordSource ? base64Normalize(recordSource.value) : null
}

module.exports = {
    accountSeedToBase64,
    toWavelet,
    broadcastAndWait,
    base58ToBase64,
    initValidatorContract,
    initBridgeContract,
    getLockData,
    base64ToHex,
    base64ToString,
    base64ToBuffer,
    getTokenInfo,
    getAssetId
}