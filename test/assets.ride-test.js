const {accountSeedToBase64, toWavelet, base58ToBase64, initBridgeContract, getTokenInfo, getAssetId,
    initNativeToken, addAsset, issueAsset, removeToken, setMinFee, setAssetState
} = require('./utils');

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
    const FEE = toWavelet(0.01);

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            admin: toWavelet(10),
            feeCollector: toWavelet(10),
            unlockSigner: toWavelet(10),
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
        UNLOCK_SIGNER = accountSeedToBase64(accounts.unlockSigner);

        await initBridgeContract();

        NATIVE_ASSET_ID_B58 = await initNativeToken();
        NATIVE_ASSET_ID = base58ToBase64(NATIVE_ASSET_ID_B58)
    });

    it ('fail: add asset unauthorized', async () => {
        const result = addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE, accounts.alice);
        await expect(result).rejectedWith("unauthorized");
    })

    it ('fail: add asset wrong source for base asset', async () => {
        const result = addAsset(BASE_ASSET_ID, NATIVE_ASSET_SOURCE_AND_ADDRESS, FEE);
        await expect(result).rejectedWith("invalid values");
    })


    it('add asset (base)', async function () {

        // Successfully added
        await addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE);

        const assetId = await getAssetId(BASE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(BASE_ASSET_ID);

        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: BASE_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_BASE,
            precision: 8,
            minFee: FEE,
            isActive: true

        })

        // Adding the same token again
        await expect(addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE)).rejectedWith("exists");
    })

    it('add asset (native)', async function () {
        await addAsset(NATIVE_ASSET_ID, NATIVE_ASSET_SOURCE_AND_ADDRESS, FEE);

        const assetId = await getAssetId(NATIVE_ASSET_SOURCE_AND_ADDRESS);
        expect(assetId).equal(NATIVE_ASSET_ID);

        const tokenInfo = await getTokenInfo(NATIVE_ASSET_ID);
        expect(tokenInfo).deep.equal({
            source: NATIVE_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_NATIVE,
            precision: 8,
            minFee: FEE,
            isActive: true
        })

        // Adding the same token again
        await expect(addAsset(NATIVE_ASSET_ID, NATIVE_ASSET_SOURCE_AND_ADDRESS, FEE)).rejectedWith("exists");

    });

    it('add asset (wrapped)', async function () {

        const assetIdB58 = await issueAsset(6);
        const assetId = base58ToBase64(assetIdB58);

        await addAsset(assetId, WRAPPED_ASSET_SOURCE_AND_ADDRESS, FEE);
        expect(await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS)).to.be.equal(assetId);

        const tokenInfo = await getTokenInfo(assetId);
        expect(tokenInfo).deep.equal({
            source: WRAPPED_ASSET_SOURCE_AND_ADDRESS,
            type: TYPE_WRAPPED,
            precision: 6,
            minFee: FEE,
            isActive: true
        })

        // Adding the same token again
        await expect(addAsset(assetId, WRAPPED_ASSET_SOURCE_AND_ADDRESS, FEE)).rejectedWith("exists");
    });

    it('fail: remove invalid signer', async () => {
        const result = removeToken(BASE_ASSET_SOURCE_AND_ADDRESS, undefined, accounts.alice);
        await expect(result).rejectedWith("unauthorized");
    })

    it('setMinFee', async () => {
        const newMinFee = 12345;
        await expect(setMinFee(BASE_ASSET_ID, newMinFee, accounts.alice)).rejectedWith("unauthorized");
        await setMinFee(BASE_ASSET_ID, newMinFee);
        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo.minFee).equal(newMinFee);
        await setMinFee(BASE_ASSET_ID, FEE)
    })

    it('disable token', async () => {
        await expect(setAssetState(BASE_ASSET_ID, false, accounts.alice)).rejectedWith("unauthorized");
        await setAssetState(BASE_ASSET_ID, false);
        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo.isActive).equal(false);
        await setAssetState(BASE_ASSET_ID, true);
    })

    it('remove (base)', async () => {
        const bridgeBalanceBefore = await balance(address(accounts.bridge));
        const nweOwnerBalanceBefore = await balance(address(accounts.newOwner));

        // Successfully added
        await removeToken(BASE_ASSET_SOURCE_AND_ADDRESS);

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
            minFee: null,
            isActive: null
        })
      
        // Remove the same token again
        await expect(removeToken(BASE_ASSET_SOURCE_AND_ADDRESS)).rejectedWith("not exists");
    })

    it('remove (native)', async () => {
        const bridgeBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
        const newOwnerBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.newOwner)) || 0;

        await removeToken(NATIVE_ASSET_SOURCE_AND_ADDRESS);

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
            minFee: null,
            isActive: null
        })
      
        // Remove the same token again
        await expect(removeToken(NATIVE_ASSET_SOURCE_AND_ADDRESS)).rejectedWith("not exists");
    })

    it('remove (wrapped)', async () => {
        const assetId = await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS);

        await removeToken(WRAPPED_ASSET_SOURCE_AND_ADDRESS);

        const assetIdAfter = await getAssetId(WRAPPED_ASSET_SOURCE_AND_ADDRESS);
        expect(assetIdAfter).equal(null);

        const tokenInfo = await getTokenInfo(assetId);
        expect(tokenInfo).deep.equal({
            source: null,
            type: null,
            precision: null,
            minFee: null,
            isActive: null
        })

        // Remove the same token again
        await expect(removeToken(WRAPPED_ASSET_SOURCE_AND_ADDRESS)).rejectedWith("not exists");
    })
})
