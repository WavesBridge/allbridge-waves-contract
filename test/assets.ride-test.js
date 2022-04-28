const {accountSeedToBase64, toWavelet, broadcastAndWait} = require('./utils');

const wvs = 10 ** 8;

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
    let ADMIN = "";
    let ALICE = "";
    let NEW_OWNER = "";

    before(async function () {
        await setupAccounts({
            assets: toWavelet(10),
            admin: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            newOwner: toWavelet(10),
        });
        const script = compile(file('assets.ride'));
        const ssTx = setScript({script}, accounts.assets);
        await broadcastAndWait(ssTx);
        console.log('Script has been set');

        ADMIN = accountSeedToBase64(accounts.admin);
        ALICE = accountSeedToBase64(accounts.alice);
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);

        console.log(`Admin b64: ${ADMIN}`);
        console.log(`Alice b64: ${ALICE}`);

        const adminTx = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ADMIN}]},
        }, accounts.admin);

        await broadcastAndWait(adminTx);

        const issueTx = issue({
            description: "Test token", 
            name: "Test", 
            quantity: toWavelet(10), 
            reissuable: true, 
            decimals: 8
        }, accounts.token);

        NATIVE_ASSET_ID = (await broadcastAndWait(issueTx)).assetId;

        await broadcastAndWait(transfer({
            amount: toWavelet(5),
            recipient: address(accounts.assets),
            assetId: NATIVE_ASSET_ID
        }, accounts.token));

        console.log('Admin set');
    });

    it('set admin', async function () {

        // Unauthorized to set new admin
        const txFail = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ALICE}]},
        }, accounts.alice);

        expect(broadcast(txFail)).to.be.rejectedWith("unauthorized")

        // Successful admin change
        const txSuccess = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ALICE}]},
        }, accounts.admin);

        await broadcastAndWait(txSuccess);

        // Check if new admin is saved
        let recordSource = await accountDataByKey(`_a`, address(accounts.assets));
        expect(recordSource.value).to.be.equal(`base64:${ALICE}`);

        // Failure to change back
        const txFail1 = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ALICE}]},
        }, accounts.admin);

        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized")

        // Successful change back
        const txSuccess1 = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "setAdmin", args: [{type:'binary', value: ADMIN}]},
        }, accounts.alice);

        await broadcastAndWait(txSuccess1);
    })

    it('add asset (base)', async function () {

        const params = {
            dApp: address(accounts.assets),
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

        let recordSource = await accountDataByKey(`${BASE_ASSET_SOURCE_AND_ADDRESS}.a`, address(accounts.assets));
        expect(recordSource.value).to.be.equal(`base64:${BASE_ASSET_ID}`);

        let recordNative = await accountDataByKey(`${BASE_ASSET_ID}.a`, address(accounts.assets));
        expect(recordNative.value).to.be.equal(`base64:${BASE_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${BASE_ASSET_ID}.t`, address(accounts.assets));
        expect(recordType.value).to.be.equal(TYPE_BASE);

        let recordPrecision = await accountDataByKey(`${BASE_ASSET_ID}.p`, address(accounts.assets));
        expect(recordPrecision.value).to.be.equal(8);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    })

    it('add asset (native)', async function () {
        const params = {
            dApp: address(accounts.assets),
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

        let recordSource = await accountDataByKey(`${NATIVE_ASSET_SOURCE_AND_ADDRESS}.a`, address(accounts.assets));
        expect(recordSource.value).to.be.equal(`base64:${NATIVE_ASSET_ID}`);

        let recordNative = await accountDataByKey(`${NATIVE_ASSET_ID}.a`, address(accounts.assets));
        expect(recordNative.value).to.be.equal(`base64:${NATIVE_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${NATIVE_ASSET_ID}.t`, address(accounts.assets));
        expect(recordType.value).to.be.equal(TYPE_NATIVE);

        let recordPrecision = await accountDataByKey(`${NATIVE_ASSET_ID}.p`, address(accounts.assets));
        expect(recordPrecision.value).to.be.equal(8);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    });

    it('add asset (wrapped)', async function () {
        const params = {
            dApp: address(accounts.assets),
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

        const recordSource = await accountDataByKey(`${WRAPPED_ASSET_SOURCE_AND_ADDRESS}.a`, address(accounts.assets));
        const wrappedAssetId = recordSource.value.replace('base64:', '');
        expect(wrappedAssetId.value).not.to.be.equal('');

        let recordNative = await accountDataByKey(`${wrappedAssetId}.a`, address(accounts.assets));
        expect(recordNative.value).to.be.equal(`base64:${WRAPPED_ASSET_SOURCE_AND_ADDRESS}`);

        let recordType = await accountDataByKey(`${wrappedAssetId}.t`, address(accounts.assets));
        expect(recordType.value).to.be.equal(TYPE_WRAPPED);

        let recordPrecision = await accountDataByKey(`${wrappedAssetId}.p`, address(accounts.assets));
        expect(recordPrecision.value).to.be.equal(6);

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    });

    it('remove (base)', async () => {
        const params = {
            dApp: address(accounts.assets),
            call: {
                function: "removeAsset",
                args: [
                    {type:'binary', value: BASE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NEW_OWNER},
                ]
            }
        };

        const bridgeBalanceBefore = await balance(address(accounts.assets));
        const nweOwnerBalanceBefore = await balance(address(accounts.newOwner));


        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const bridgeBalanceAfter = await balance(address(accounts.assets));
        const nweOwnerBalanceAfter = await balance(address(accounts.newOwner));
        
        expect(bridgeBalanceAfter).equal(0);
        expect(nweOwnerBalanceAfter).equal(nweOwnerBalanceBefore + bridgeBalanceBefore);

        let recordSource = await accountDataByKey(`${BASE_ASSET_SOURCE_AND_ADDRESS}.a`, address(accounts.assets));
        expect(recordSource).equal(null);

        let recordNative = await accountDataByKey(`${BASE_ASSET_ID}.a`, address(accounts.assets));
        expect(recordNative).equal(null);

        let recordType = await accountDataByKey(`${BASE_ASSET_ID}.t`, address(accounts.assets));
        expect(recordType).equal(null);

        let recordPrecision = await accountDataByKey(`${BASE_ASSET_ID}.p`, address(accounts.assets));
        expect(recordPrecision).equal(null);
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        expect(broadcast(txFail2)).rejectedWith("not exists");
    })

    it('remove (native)', async () => {
        const params = {
            dApp: address(accounts.assets),
            call: {
                function: "removeAsset",
                args: [
                    {type:'binary', value: NATIVE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NEW_OWNER},
                ]
            }
        };

        const bridgeBalanceBefore = await assetBalance(NATIVE_ASSET_ID, address(accounts.assets));
        const nweOwnerBalanceBefore = await assetBalance(NATIVE_ASSET_ID, address(accounts.newOwner));
        console.log('bridgeBalanceBefore', bridgeBalanceBefore);
        console.log('nweOwnerBalanceBefore', nweOwnerBalanceBefore);


        // // Wrong signer
        // const txFail1 = invokeScript(params, accounts.alice);
        // expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // // Successfully added
        // const tx = invokeScript(params, accounts.admin);

        // await broadcastAndWait(tx);

        // const bridgeBalanceAfter = await assetBalance(NATIVE_ASSET_ID, address(accounts.assets));
        // const nweOwnerBalanceAfter = await assetBalance(NATIVE_ASSET_ID, address(accounts.newOwner));
        
        // expect(bridgeBalanceAfter).equal(0);
        // expect(nweOwnerBalanceAfter).equal(nweOwnerBalanceBefore + bridgeBalanceBefore);

        // let recordSource = await accountDataByKey(`${NATIVE_ASSET_SOURCE_AND_ADDRESS}.a`, address(accounts.assets));
        // expect(recordSource).equal(null);

        // let recordNative = await accountDataByKey(`${NATIVE_ASSET_ID}.a`, address(accounts.assets));
        // expect(recordNative).equal(null);

        // let recordType = await accountDataByKey(`${NATIVE_ASSET_ID}.t`, address(accounts.assets));
        // expect(recordType).equal(null);

        // let recordPrecision = await accountDataByKey(`${NATIVE_ASSET_ID}.p`, address(accounts.assets));
        // expect(recordPrecision).equal(null);
      
        // // Remove the same token again
        // const txFail2 = invokeScript(params, accounts.admin);
        // expect(broadcast(txFail2)).rejectedWith("not exists");
    })
})