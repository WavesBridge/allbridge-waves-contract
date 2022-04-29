const { base64Decode, base58Decode } = require('@waves/ts-lib-crypto');
const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64} = require('./utils');
const eth = require('ethereumjs-util');

const NATIVE_ASSET_SOURCE = Buffer.from("POL\0")
const NATIVE_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const NATIVE_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([NATIVE_ASSET_SOURCE, NATIVE_ASSET_ADDRESS]).toString("base64")

const WRAPPED_ASSET_SOURCE = Buffer.from("WAVE")
const WRAPPED_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const WRAPPED_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([WRAPPED_ASSET_SOURCE, WRAPPED_ASSET_ADDRESS]).toString("base64")

const TYPE_BASE = 0;
const TYPE_NATIVE = 1;
const TYPE_WRAPPED = 2;

const BASE_ASSET_SOURCE_AND_ADDRESS = "V0FWRVdBVkU=";
const BASE_ASSET_ID = "V0FWRQ==";

describe('Assets', async function () {

    this.timeout(100000);

    let NATIVE_ASSET_ID = "";
    let NATIVE_ASSET_ID_B58 = "";
    let ADMIN = "";
    let ALICE = "";
    let ASSETS = "";
    let NEW_OWNER = "";
    let VALIDATOR = "";
    let BRIDGE = "";
    const oracle = wavesCrypto.randomBytes(32);

    before(async function () {
        await setupAccounts({
            assets: toWavelet(10),
            bridge: toWavelet(10),
            validator: toWavelet(10),
            admin: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            newOwner: toWavelet(10),
        });
        ADMIN = accountSeedToBase64(accounts.admin);
        ALICE = accountSeedToBase64(accounts.alice);
        ASSETS = accountSeedToBase64(accounts.assets)
        VALIDATOR = accountSeedToBase64(accounts.validator)
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);
        BRIDGE = accountSeedToBase64(accounts.bridge);

        const assetScript = compile(file('assets.ride'));
        const asTx = setScript({script: assetScript}, accounts.assets);
        await broadcastAndWait(asTx);

        const brindgeScript = compile(file('bridge.ride'));
        const bsTx = setScript({script: brindgeScript}, accounts.bridge);
        await broadcastAndWait(bsTx);

        const validatorScript = compile(file('validator.ride'));
        const vsTx = setScript({script: validatorScript}, accounts.validator);
        await broadcastAndWait(vsTx);
        const oraclePublicKey = eth.privateToPublic(Buffer.from(oracle)).toString("base64");
        
        const setTx = await invoke({
            dApp: address(accounts.validator),
            functionName: 'setConfig',
            arguments: [[1], {type:'binary', value: BRIDGE}, {type:'binary', value: oraclePublicKey}]
        }, accounts.admin)
        await waitForTx(setTx.id);

        console.log('Script has been set');

        const adminTx = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ADMIN}]},
        }, accounts.admin);

        await broadcastAndWait(adminTx);
        await broadcastAndWait(invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ASSETS}, {type:'binary', value: VALIDATOR}]},
        }, accounts.admin));

        const issueTx = issue({
            description: "Test token", 
            name: "Test", 
            quantity: toWavelet(10), 
            reissuable: true, 
            decimals: 8
        }, accounts.token);

        NATIVE_ASSET_ID_B58 = (await broadcastAndWait(issueTx)).assetId;
        console.log(`Token b58: ${NATIVE_ASSET_ID_B58}`);
        NATIVE_ASSET_ID = base58ToBase64(NATIVE_ASSET_ID_B58)
        await broadcastAndWait(transfer({
            amount: toWavelet(5),
            recipient: address(accounts.assets),
            assetId: NATIVE_ASSET_ID_B58
        }, accounts.token));

        console.log('Admin set');
    });

    it('set assets', async function () {
        // TODO
    })

    it('lock', async function () {

        const addTokenTx = await invoke({dApp: address(accounts.assets), functionName: 'addAsset', arguments: [
            base64Decode(BASE_ASSET_SOURCE_AND_ADDRESS), base64Decode(BASE_ASSET_ID), TYPE_BASE, "", "", 8
        ]}, accounts.admin);
        await waitForTx(addTokenTx.id);

        const lockId = Buffer.from(new Array(16).fill(1))
        const recipient = Buffer.from(new Array(32).fill(2));
        const destination = Buffer.from("ETH\0");

        const lockTs = await invoke({
            dApp: address(accounts.bridge), 
            functionName: 'lock',
            arguments: [lockId, recipient, destination],
            payment: toWavelet(0.01)
        }, accounts.alice);
        await waitForTx(lockTs.id);
    })
})
