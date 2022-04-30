const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64} = require('./utils');

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
    let VALIDATOR = "";
    let ALICE = "";
    let NEW_OWNER = "";

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            admin: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            validator: toWavelet(10),
            newOwner: toWavelet(10),
        });
        const script = compile(file('bridge.ride'));
        const ssTx = setScript({script}, accounts.bridge);
        await broadcastAndWait(ssTx);
        console.log('Script has been set');

        ADMIN = accountSeedToBase64(accounts.admin);
        VALIDATOR = accountSeedToBase64(accounts.validator);
        ALICE = accountSeedToBase64(accounts.alice);
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);

        console.log(`Admin b64: ${ADMIN}`);
        console.log(`Alice b64: ${ALICE}`);

        const adminTx = invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ADMIN}, {type:'binary', value: VALIDATOR}]},
        }, accounts.admin);

        await broadcastAndWait(adminTx);

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
            recipient: address(accounts.bridge),
            assetId: NATIVE_ASSET_ID_B58
        }, accounts.token));

        console.log('Admin set');
    });

    it('set admin', async function () {

        // Unauthorized to set new admin
        const txFail = invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ALICE}, {type:'binary', value: VALIDATOR}]},
        }, accounts.alice);

        expect(broadcast(txFail)).to.be.rejectedWith("unauthorized")

        // Successful admin change
        const txSuccess = invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ALICE}, {type:'binary', value: VALIDATOR}]},
        }, accounts.admin);

        await broadcastAndWait(txSuccess);

        // Check if new admin is saved
        let recordSource = await accountDataByKey(`_a`, address(accounts.bridge));
        expect(recordSource.value).to.be.equal(`base64:${ALICE}`);
        let recordValidator = await accountDataByKey(`_v`, address(accounts.bridge));
        expect(recordValidator.value).to.be.equal(`base64:${VALIDATOR}`);

        // Failure to change back
        const txFail1 = invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ALICE}, {type:'binary', value: VALIDATOR}]},
        }, accounts.admin);

        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized")

        // Successful change back
        const txSuccess1 = invokeScript({
            dApp: address(accounts.bridge),
            call: {function: "setConfig", args: [{type:'binary', value: ADMIN}, {type:'binary', value: VALIDATOR}]},
        }, accounts.alice);

        await broadcastAndWait(txSuccess1);
    })

    it('add asset (base)', async function () {

        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "addAsset",
                args: [
                    {type:'binary', value: BASE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: BASE_ASSET_ID},
                    {type:'integer', value: TYPE_BASE},
                    {type:'string', value: ""},
                    {type:'string', value: ""},
                    {type:'integer', value: 8},
                ]
            },
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        let paramsFail = JSON.parse(JSON.stringify(params));

        // Wrong precision
        paramsFail.call.args[5].value = 7;  
        const txFailPrecision = invokeScript(paramsFail, accounts.admin);
        expect(broadcast(txFailPrecision)).to.be.rejectedWith("invalid values");

        // Wrong source/address
        paramsFail = JSON.parse(JSON.stringify(params));
        paramsFail.call.args[0].value = NATIVE_ASSET_SOURCE_AND_ADDRESS;  
        const txFailSourceAndAddress = invokeScript(paramsFail, accounts.admin);
        expect(broadcast(txFailSourceAndAddress)).to.be.rejectedWith("invalid values");

        // Wrong asset id
        paramsFail = JSON.parse(JSON.stringify(params));
        paramsFail.call.args[1].value = NATIVE_ASSET_ID;  
        const txFailAssetId = invokeScript(paramsFail, accounts.admin);
        expect(broadcast(txFailAssetId)).to.be.rejectedWith("invalid values");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        let recordSource = await accountDataByKey(`${BASE_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        expect(recordSource.value).to.be.equal(`base64:${BASE_ASSET_ID}`);

        let recordNative = await accountDataByKey(`${BASE_ASSET_ID}_aa`, address(accounts.bridge));
        expect(recordNative.value).to.be.equal(`base64:${BASE_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${BASE_ASSET_ID}_at`, address(accounts.bridge));
        expect(recordType.value).to.be.equal(TYPE_BASE);

        let recordPrecision = await accountDataByKey(`${BASE_ASSET_ID}_ap`, address(accounts.bridge));
        expect(recordPrecision.value).to.be.equal(8);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    })

    it('add asset (native)', async function () {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "addAsset",
                args: [
                    {type:'binary', value: NATIVE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NATIVE_ASSET_ID},
                    {type:'integer', value: TYPE_NATIVE},
                    {type:'string', value: ""},
                    {type:'string', value: ""},
                    {type:'integer', value: 8},
                ]
            },
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        let recordSource = await accountDataByKey(`${NATIVE_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        expect(recordSource.value).to.be.equal(`base64:${NATIVE_ASSET_ID}`);

        let recordNative = await accountDataByKey(`${NATIVE_ASSET_ID}_aa`, address(accounts.bridge));
        expect(recordNative.value).to.be.equal(`base64:${NATIVE_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${NATIVE_ASSET_ID}_at`, address(accounts.bridge));
        expect(recordType.value).to.be.equal(TYPE_NATIVE);

        let recordPrecision = await accountDataByKey(`${NATIVE_ASSET_ID}_ap`, address(accounts.bridge));
        expect(recordPrecision.value).to.be.equal(8);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    });

    it('add asset (wrapped)', async function () {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "addAsset",
                args: [
                    {type:'binary', value: WRAPPED_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: ""},
                    {type:'integer', value: TYPE_WRAPPED},
                    {type:'string', value: "Wrapped name"},
                    {type:'string', value: "Wrapped description"},
                    {type:'integer', value: 6},
                ]
            },
            fee: "100500000"
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const recordSource = await accountDataByKey(`${WRAPPED_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        const wrappedAssetId = recordSource.value.replace('base64:', '');
        expect(wrappedAssetId.value).not.to.be.equal('');

        let recordNative = await accountDataByKey(`${wrappedAssetId}_aa`, address(accounts.bridge));
        expect(recordNative.value).to.be.equal(`base64:${WRAPPED_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${wrappedAssetId}_at`, address(accounts.bridge));
        expect(recordType.value).to.be.equal(TYPE_WRAPPED);

        let recordPrecision = await accountDataByKey(`${wrappedAssetId}_ap`, address(accounts.bridge));
        expect(recordPrecision.value).to.be.equal(6);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    });

    it('remove (base)', async () => {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "removeAsset",
                args: [
                    {type:'binary', value: BASE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NEW_OWNER},
                ]
            }
        };

        const bridgeBalanceBefore = await balance(address(accounts.bridge));
        const nweOwnerBalanceBefore = await balance(address(accounts.newOwner));


        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const bridgeBalanceAfter = await balance(address(accounts.bridge));
        const nweOwnerBalanceAfter = await balance(address(accounts.newOwner));
        
        expect(bridgeBalanceAfter).equal(0);
        expect(nweOwnerBalanceAfter).equal(nweOwnerBalanceBefore + bridgeBalanceBefore);

        let recordSource = await accountDataByKey(`${BASE_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        expect(recordSource).equal(null);

        let recordNative = await accountDataByKey(`${BASE_ASSET_ID}_aa`, address(accounts.bridge));
        expect(recordNative).equal(null);

        let recordType = await accountDataByKey(`${BASE_ASSET_ID}_at`, address(accounts.bridge));
        expect(recordType).equal(null);

        let recordPrecision = await accountDataByKey(`${BASE_ASSET_ID}_ap`, address(accounts.bridge));
        expect(recordPrecision).equal(null);
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).rejectedWith("not exists");
    })

    it('remove (native)', async () => {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "removeAsset",
                args: [
                    {type:'binary', value: NATIVE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NEW_OWNER}
                ]
            }
        };

        const bridgeBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
        const newOwnerBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.newOwner)) || 0;

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const bridgeBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
        const newOwnerBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.newOwner)) || 0;
        
        expect(bridgeBalanceAfter).equal(0);
        expect(newOwnerBalanceAfter).equal(newOwnerBalanceBefore + bridgeBalanceBefore);

        let recordSource = await accountDataByKey(`${NATIVE_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        expect(recordSource).equal(null);

        let recordNative = await accountDataByKey(`${NATIVE_ASSET_ID}_aa`, address(accounts.bridge));
        expect(recordNative).equal(null);

        let recordType = await accountDataByKey(`${NATIVE_ASSET_ID}_at`, address(accounts.bridge));
        expect(recordType).equal(null);

        let recordPrecision = await accountDataByKey(`${NATIVE_ASSET_ID}_ap`, address(accounts.bridge));
        expect(recordPrecision).equal(null);
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).rejectedWith("not exists");
    })

    it('remove (wrapped)', async () => {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "removeAsset",
                args: [
                    {type:'binary', value: WRAPPED_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NEW_OWNER}
                ]
            }
        };

        const recordSourceBefore = await accountDataByKey(`${WRAPPED_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        const wrappedAssetId = recordSourceBefore.value.replace('base64:', '');

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        let recordSource = await accountDataByKey(`${WRAPPED_ASSET_SOURCE_AND_ADDRESS}_aa`, address(accounts.bridge));
        expect(recordSource).equal(null);

        let recordNative = await accountDataByKey(`${wrappedAssetId}_aa`, address(accounts.bridge));
        expect(recordNative).equal(null);

        let recordType = await accountDataByKey(`${wrappedAssetId}_at`, address(accounts.bridge));
        expect(recordType).equal(null);

        let recordPrecision = await accountDataByKey(`${wrappedAssetId}_ap`, address(accounts.bridge));
        expect(recordPrecision).equal(null);
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).rejectedWith("not exists");
    })
})
