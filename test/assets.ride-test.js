const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64, initBridgeContract, getTokenInfo, getAssetId, invokeAndWait} = require('./utils');

const NATIVE_ASSET_SOURCE = Buffer.from("POL\0")
const NATIVE_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const NATIVE_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([NATIVE_ASSET_SOURCE, NATIVE_ASSET_ADDRESS]).toString("base64")

const WRAPPED_ASSET_SOURCE = Buffer.from("WAVE")
const WRAPPED_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const WRAPPED_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([WRAPPED_ASSET_SOURCE, WRAPPED_ASSET_ADDRESS]).toString("base64")

const TYPE_BASE = 0;
const TYPE_NATIVE = 1;
const TYPE_WRAPPED = 2;

const BASE_ASSET_SOURCE_AND_ADDRESS = "V0FWRVdBVkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const BASE_ASSET_ID = "V0FWRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe('Assets', async function () {

    this.timeout(100000);

    let NATIVE_ASSET_ID = "";
    let NATIVE_ASSET_ID_B58 = "";
    let ADMIN = "";
    let FEE_COLLECTOR = "";
    let VALIDATOR = "";
    let ALICE = "";
    let NEW_OWNER = "";
    let UNLOCK_SIGNER = "";

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            admin: toWavelet(10),
            feeCollector: toWavelet(10),
            unclokSigner: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            validator: toWavelet(10),
            newOwner: toWavelet(10),
        });
        ADMIN = accountSeedToBase64(accounts.admin);
        VALIDATOR = accountSeedToBase64(accounts.validator);
        FEE_COLLECTOR = accountSeedToBase64(accounts.feeCollector);
        ALICE = accountSeedToBase64(accounts.alice);
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);
        UNLOCK_SIGNER = accountSeedToBase64(accounts.unclokSigner);

        console.log(`Admin b64: ${ADMIN}`);
        console.log(`Alice b64: ${ALICE}`);

        await initBridgeContract();

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


    it('add asset (base)', async function () {

        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: 'addAsset',
                args: [
                    {type:'binary', value: BASE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: BASE_ASSET_ID},
                    {type:'integer', value: 1000000},
                ]
            },
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        let paramsFail = JSON.parse(JSON.stringify(params));

        // Wrong source/address
        paramsFail = JSON.parse(JSON.stringify(params));
        paramsFail.call.args[0].value = NATIVE_ASSET_SOURCE_AND_ADDRESS;  
        const txFailSourceAndAddress = invokeScript(paramsFail, accounts.admin);
        await expect(broadcast(txFailSourceAndAddress)).to.be.rejectedWith("invalid values");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const assetId = await getAssetId(BASE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(BASE_ASSET_ID);

        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: BASE_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_BASE,
            precision: 8,
            minFee: 1000000
        })

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    })

    it('add asset (native)', async function () {
        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "addAsset",
                args: [
                    {type:'binary', value: NATIVE_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: NATIVE_ASSET_ID},
                    {type:'integer', value: 1000000},
                ]
            },
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const assetId = await getAssetId(NATIVE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(NATIVE_ASSET_ID);

        const tokenInfo = await getTokenInfo(NATIVE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: NATIVE_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_NATIVE,
            precision: 8,
            minFee: 1000000
        })

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).to.be.rejectedWith("exists");
    });

    it('add asset (wrapped)', async function () {
        const addedToken = await broadcastAndWait(invokeScript({
            dApp: address(accounts.bridge),
            call: {
                function: "issue",
                args: [
                    {type:'string', value: "Wrapped name"},
                    {type:'string', value: "Wrapped description"},
                    {type:'integer', value: 6},
                ]
            },
            fee: "100500000"}, accounts.admin))

        const assetId = base58ToBase64(addedToken.stateChanges.issues[0].assetId);

        const params = {
            dApp: address(accounts.bridge),
            call: {
                function: "addAsset",
                args: [
                    {type:'binary', value: WRAPPED_ASSET_SOURCE_AND_ADDRESS},
                    {type:'binary', value: assetId},
                    {type:'integer', value: 1000000},
                ]
            },
            fee: "100500000"
        };

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        expect(await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS)).to.be.equal(assetId);

        const tokenInfo = await getTokenInfo(assetId);
        expect(tokenInfo).deep.equal({
            source: WRAPPED_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_WRAPPED,
            precision: 6,
            minFee: 1000000
        })

        // Adding the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).to.be.rejectedWith("exists");
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
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const bridgeBalanceAfter = await balance(address(accounts.bridge));
        const nweOwnerBalanceAfter = await balance(address(accounts.newOwner));
        
        expect(bridgeBalanceAfter).equal(0);
        expect(nweOwnerBalanceAfter).equal(nweOwnerBalanceBefore + bridgeBalanceBefore);

        const assetId = await getAssetId(BASE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(null);

        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: null,
            type: null,
            precision: null,
            minFee: null
        })
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).rejectedWith("not exists");
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
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const bridgeBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
        const newOwnerBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.newOwner)) || 0;
        
        expect(bridgeBalanceAfter).equal(0);
        expect(newOwnerBalanceAfter).equal(newOwnerBalanceBefore + bridgeBalanceBefore);

        const assetId = await getAssetId(NATIVE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(null);

        const tokenInfo = await getTokenInfo(NATIVE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: null,
            type: null,
            precision: null,
            minFee: null
        })
      
        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).rejectedWith("not exists");
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

        const assetId = await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS);

        // Wrong signer
        const txFail1 = invokeScript(params, accounts.alice);
        await expect(broadcast(txFail1)).to.be.rejectedWith("unauthorized");

        // Successfully added
        const tx = invokeScript(params, accounts.admin);

        await broadcastAndWait(tx);

        const assetIdAfter = await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS);
        expect(assetIdAfter).equal(null);

        const tokenInfo = await getTokenInfo(assetId);
        expect(tokenInfo).deep.equal({
            source: null,
            type: null,
            precision: null,
            minFee: null
        })

        // Remove the same token again
        const txFail2 = invokeScript(params, accounts.admin);
        await expect(broadcast(txFail2)).rejectedWith("not exists");
    })
})
