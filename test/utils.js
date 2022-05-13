const eth = require('ethereumjs-util');

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

async function invokeAndWait(params, seed) {
    const tx = await invoke(params, seed);
    return await waitForTx(tx.id);
}


function clone(data) {
    return JSON.parse(JSON.stringify(data))
}

function getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, oracle) {
    const message = [lockId, recipient, amount, lockSource, tokenSourceAndAddress, Buffer.from('WAVE').toString('base64')].join('_');

    const hashBuffer = wavesCrypto.keccak(Buffer.from(message, 'utf-8'));

    const sign = eth.ecsign(hashBuffer, oracle);
    const signatureHex = eth.toRpcSig(sign.v, sign.r, sign.s)
    return Buffer.from(signatureHex.slice(2), 'hex').toString('base64');
}

async function initValidatorContract(oracle) {
    oracle = oracle || wavesCrypto.randomBytes(32);
    const oraclePublicKey = eth.privateToPublic(Buffer.from(oracle)).toString('base64');


    const script = compile(file('validator.ride'));
    const deployTx = setScript({script}, accounts.validator);
    await broadcastAndWait(deployTx);

    const initTx = await invoke({
        dApp: address(accounts.validator),
        functionName: 'init',
        arguments: [[1], {type: 'binary', value: accountSeedToBase64(accounts.bridge)},
            {type: 'binary', value: oraclePublicKey}]
    }, accounts.admin);
    await waitForTx(initTx.id);
    return oracle;
}

async function initBridgeContract() {
    const script = compile(file('bridge.ride'));
    const deployTx = setScript({script}, accounts.bridge);
    await broadcastAndWait(deployTx);

    const initTx = await invoke({
        dApp: address(accounts.bridge),
        functionName: 'init',
        arguments: [{type: 'binary', value: accountSeedToBase64(accounts.admin)},
            {type: 'binary', value: accountSeedToBase64(accounts.validator)},
            {type: 'binary', value: accountSeedToBase64(accounts.feeCollector)},
            {type: 'binary', value: accountSeedToBase64(accounts.unlockSigner)},
            {type: 'integer', value: 30}],
    }, accounts.admin)
    await waitForTx(initTx.id);
    await setManager('ASSET_MANAGER', accounts.admin);
    await setManager('STOP_MANAGER', accounts.admin);
}

async function getLockData(lockIdStr) {
    let lockRecipient = await accountDataByKey(`${lockIdStr}_lr`, address(accounts.validator));
    let lockAmount = await accountDataByKey(`${lockIdStr}_la`, address(accounts.validator));
    let lockDestination = await accountDataByKey(`${lockIdStr}_ld`, address(accounts.validator));
    let lockAssetSource = await accountDataByKey(`${lockIdStr}_las`, address(accounts.validator));

    return {
        recipient: lockRecipient ? base64Normalize(lockRecipient.value) : null,
        amount: lockAmount ? lockAmount.value : null,
        destination: lockDestination ? base64Normalize(lockDestination.value) : null,
        assetSource: lockAssetSource ? base64Normalize(lockAssetSource.value) : null,
    }
}

async function getTokenInfo(assetIdStr) {
    let recordNative = await accountDataByKey(`${assetIdStr}_aa`, address(accounts.bridge));
    let recordType = await accountDataByKey(`${assetIdStr}_at`, address(accounts.bridge));
    let recordPrecision = await accountDataByKey(`${assetIdStr}_ap`, address(accounts.bridge));
    let recordMinFee = await accountDataByKey(`${assetIdStr}_amf`, address(accounts.bridge));
    let recordIsActive = await accountDataByKey(`${assetIdStr}_aia`, address(accounts.bridge));

    return {
        source: recordNative ? base64Normalize(recordNative.value) : null,
        type: recordType ? recordType.value : null,
        precision: recordPrecision ? recordPrecision.value : null,
        minFee: recordMinFee ? recordMinFee.value : null,
        isActive: recordIsActive ? recordIsActive.value : null
    }
}

async function setManager(managerType, seed, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: 'setManager',
        arguments: [
            {type: 'string', value: managerType},
            {type: 'binary', value: accountSeedToBase64(seed)}
        ]
    }, sender)
}

async function getAssetId(source) {
    let recordSource = await accountDataByKey(`${source}_aa`, address(accounts.bridge));
    return recordSource ? base64Normalize(recordSource.value) : null
}


async function getManager(managerType) {
    let recordSource = await accountDataByKey(`${managerType}_m`, address(accounts.bridge));
    return recordSource ? base64Normalize(recordSource.value) : null
}

function generateLockId() {
    const lockId = wavesCrypto.randomBytes(16);
    lockId[0] = 1;
    return Buffer.from(lockId).toString('base64')
}

async function initNativeToken() {
    const issueTx = issue({
        description: "Native token",
        name: "Test",
        quantity: toWavelet(1000),
        reissuable: true,
        decimals: 8
    }, accounts.token);

    return (await broadcastAndWait(issueTx)).assetId;
}

async function mintToken(assetId, recipient, amount, minterSeed) {
    await broadcastAndWait(reissue({
        quantity: amount,
        assetId,
        reissuable: true
    }, minterSeed));

    await broadcastAndWait(transfer({
        amount,
        recipient,
        assetId
    }, minterSeed));
}


function lock(recipient, destination, amount, lockId, sender) {
    lockId = lockId || generateLockId();
    sender = sender || accounts.alice;

    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: 'lock',
        arguments: [
            {type: 'binary', value: lockId},
            {type: 'binary', value: recipient},
            {type: 'binary', value: destination},
        ],
        payment: amount
    }, sender)
}
function unlock(amount, lockSource, tokenSourceAndAddress, oracle, lockId, recipient, signature, sender) {
    lockId = lockId || generateLockId();
    sender = sender || accounts.alice;
    recipient = recipient || accountSeedToBase64(accounts.alice);
    signature = signature || getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, oracle)

    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: 'unlock',
        arguments: [
            {type:'binary', value: lockId},
            {type:'binary', value: recipient},
            {type:'integer', value: amount},
            {type:'binary', value: lockSource},
            {type:'binary', value: tokenSourceAndAddress},
            {type:'binary', value: signature},
        ],
    }, sender)
}

function setAssetState(assetId, state, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: 'setAssetState',
        arguments: [
            {type: 'binary', value: assetId},
            {type: 'boolean', value: state},
        ]
    }, sender)
}

function addAsset(assetId, assetSource, fee, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({dApp: address(accounts.bridge), functionName: 'addAsset', arguments: [
            {type: 'binary', value: assetSource},
            {type: 'binary', value: assetId},
            {type: 'integer', value: fee}
        ]}, sender);
}

async function issueAsset(precision = 8) {
    const tx = await broadcastAndWait(invokeScript({
        dApp: address(accounts.bridge),
        call: {
            function: "issue",
            args: [
                {type:'string', value: "Wrapped name"},
                {type:'string', value: "Wrapped description"},
                {type:'integer', value: precision},
            ]
        },
        fee: "100500000"}, accounts.admin))

    return tx.stateChanges.issues[0].assetId;
}

async function removeAsset(source, newOwner, sender) {
    sender = sender || accounts.admin;
    newOwner = newOwner || base58ToBase64(address(accounts.newOwner));

    return invokeAndWait({
        dApp: address(accounts.bridge),
            functionName: "removeAsset",
            arguments: [
                {type:'binary', value: source},
                {type:'binary', value: newOwner},
            ]
    }, sender)
}

async function setMinFee(assetId, minFee, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "setMinFee",
        arguments: [
            {type:'binary', value: assetId},
            {type:'integer', value: minFee},
        ]
    }, sender)
}

async function setFeeCollector(feeCollectorSeed, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "setFeeCollector",
        arguments: [
            {type:'binary', value: accountSeedToBase64(feeCollectorSeed)},
        ]
    }, sender)
}

async function setValidator(validatorSeed, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "setValidator",
        arguments: [
            {type:'binary', value: accountSeedToBase64(validatorSeed)},
        ]
    }, sender)
}

async function startBridge(sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "startBridge",
        arguments: []
    }, sender)
}

async function stopBridge(sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "stopBridge",
        arguments: []
    }, sender)
}

async function setBaseFeeRate(baseFeeRateBP, sender) {
    sender = sender || accounts.admin;
    return invokeAndWait({
        dApp: address(accounts.bridge),
        functionName: "setBaseFeeRate",
        arguments: [
            {type:'integer', value: baseFeeRateBP},
        ]
    }, sender)
}

async function hasUnlock(lockSource, lockId) {
    const hasUnlock = await accountDataByKey(`${lockSource}_${lockId}_u`, address(accounts.validator));
    return hasUnlock.value || false;
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
    getAssetId,
    invokeAndWait,
    getSignature,
    clone,
    setManager,
    base64Normalize,
    getManager,
    generateLockId,
    lock,
    unlock,
    setAssetState,
    initNativeToken,
    mintToken,
    addAsset,
    issueAsset,
    hasUnlock,
    removeAsset,
    setMinFee,
    setValidator,
    startBridge,
    stopBridge,
    setFeeCollector,
    setBaseFeeRate
}
