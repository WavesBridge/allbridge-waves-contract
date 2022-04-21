const eth = require('ethereumjs-util');
const crypto = require('crypto');

const wvs = 10 ** 8;

const VERSION = Buffer.from([1]).toString("base64");

describe('Validator', async function () {

    let ADMIN = "";
    let BRIDGE = "";
    const oracle = crypto.randomBytes(32);

    before(async function () {
        await setupAccounts({
            bridge: 0.05 * wvs,
            validator: 0.05 * wvs,
            admin: 0.05 * wvs,
            alice: 0.05 * wvs,
        });
        const script = compile(file('validator.ride'));
        const ssTx = setScript({script}, accounts.validator);
        await broadcast(ssTx);
        await waitForTx(ssTx.id);
        console.log('Script has been set');

        ADMIN = Buffer.from(wavesCrypto.base58Decode(address(accounts.admin))).toString("base64");
        BRIDGE = Buffer.from(wavesCrypto.base58Decode(address(accounts.bridge))).toString("base64");

        const adminTx = invokeScript({
            dApp: address(accounts.validator),
            call: {function: "setAdmin", args: [{type:'binary', value: ADMIN}]},
        }, accounts.admin);

        await broadcast(adminTx);
        await waitForTx(adminTx.id);

        console.log('Admin set');

        // Calculate oracle public key
        const publicKey = eth.privateToPublic(oracle).toString("base64");

        const configTx = invokeScript({
            dApp: address(accounts.validator),
            call: {function: "setConfig", args: [
                {type:'binary', value: VERSION},
                {type:'binary', value: BRIDGE},
                {type:'binary', value: publicKey},
            ]},
        }, accounts.admin);

        await broadcast(configTx);
        await waitForTx(configTx.id);

        console.log('Config set');
    });

    it('create unlock', async function () {
        const lockId = Buffer.from([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
        const recipient = Buffer.from([22, 33, 44]).toString("base64");
        const amount = 1000;
        const lockSource = Buffer.from([11, 22, 33, 44]).toString("base64");
        const tokenSourceAndAddress = Buffer.from([11, 22, 33, 44, 55]).toString("base64");
        
        const message = `${lockId}.${recipient}.${amount}.${lockSource}.${tokenSourceAndAddress}`;
        const hashBuffer = wavesCrypto.keccak(Buffer.from(message, "utf-8"));
        const sign = eth.ecsign(hashBuffer, oracle);
        const signatureHex = eth.toRpcSig(sign.v, sign.r, sign.s)

        const signature = Buffer.from(signatureHex.slice(2), "hex").toString("base64");

        const unlockTx = invokeScript({
            dApp: address(accounts.validator),
            call: {function: "createUnlock", args: [
                {type:'binary', value: lockId},
                {type:'binary', value: recipient},
                {type:'integer', value: amount},
                {type:'binary', value: lockSource},
                {type:'binary', value: tokenSourceAndAddress},
                {type:'binary', value: signature},
            ]},
        }, accounts.bridge);

        await broadcast(unlockTx);
        await waitForTx(unlockTx.id);
    });
});