const {accountSeedToBase64, toWavelet, initBridgeContract,
    setManager, base64Normalize, getManager, setFeeCollector, setValidator, startBridge, stopBridge,
    addAsset, removeAsset, setMinFee, setBaseFeeRate, setAssetState, issueAsset, getTokenInfo, setUnlockSigner,
    invokeAndWait
} = require('./utils');

const BASE_ASSET_SOURCE_AND_ADDRESS = "V0FWRVdBVkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const BASE_ASSET_ID = "V0FWRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const FEE = 1000000;
describe('Manager', async function () {

    this.timeout(100000);

    let ADMIN = "";
    let ALICE = "";

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
        ALICE = accountSeedToBase64(accounts.alice);

        await initBridgeContract();
        await addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE);
    });

    it ('set manager invalid address', async () => {
        const result = invokeAndWait({
            dApp: address(accounts.bridge),
            functionName: 'setManager',
            arguments: [
                {type: 'string', value: 'BRIDGE_MANAGER'},
                {type: 'string', value: 'someinvaliddata'}
            ]
        }, accounts.admin);
        await expect(result).rejectedWith("Error while executing account-script: value() called on unit value on function 'addressFromString' call")
    })

    it('set bridge manager', async function () {
        const managerType = 'BRIDGE_MANAGER';
        // Unauthorized to set new admin
        await expect(setManager(managerType, accounts.alice, accounts.alice)).rejectedWith("unauthorized");
        await expect(getManager(managerType)).eventually.equal(ADMIN);

        // Successful admin change
        await setManager(managerType, accounts.alice)
        // Check if new admin is saved
        await expect(getManager(managerType)).eventually.equal(ALICE);

        await expect(setManager(managerType, accounts.admin)).rejectedWith("unauthorized")
        await expect(setFeeCollector(accounts.feeCollector)).rejectedWith("unauthorized")
        await expect(setValidator(accounts.validator)).rejectedWith("unauthorized")
        await expect(startBridge()).rejectedWith("unauthorized")

        await setManager(managerType, accounts.admin, accounts.alice)

        await expect(getManager(managerType)).eventually.equal(ADMIN);
    })

    it('set stop bridge manager', async () => {
        const managerType = 'STOP_MANAGER';
        await setManager(managerType, accounts.alice)
        await expect(stopBridge()).rejectedWith("unauthorized");
        await stopBridge(accounts.alice);
        await startBridge();
        await setManager(managerType, accounts.admin)
    })

    it('set asset manager', async () => {
        const managerType = 'ASSET_MANAGER';
        await setManager(managerType, accounts.alice)
        await expect(addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE)).rejectedWith("unauthorized");
        await expect(removeAsset(BASE_ASSET_SOURCE_AND_ADDRESS)).rejectedWith("unauthorized");
        await expect(setMinFee(BASE_ASSET_ID, 10)).rejectedWith("unauthorized");
        await expect(setAssetState(BASE_ASSET_ID, false)).rejectedWith("unauthorized");
        await expect(setBaseFeeRate( 10)).rejectedWith("unauthorized");
        await expect(issueAsset( )).rejectedWith("unauthorized");
        await setManager(managerType, accounts.admin)
    })

    it('setBaseFeeRate', async () => {
        const newBaseFeeRateBp = 423;
        await setBaseFeeRate(newBaseFeeRateBp);
        const recordSource = await accountDataByKey(`_bfr`, address(accounts.bridge));
        expect(recordSource.value).equal(newBaseFeeRateBp);
        await setBaseFeeRate(30);
    })

    it('setMinFee', async () => {
        const newFee = 1234534
        await setMinFee(BASE_ASSET_ID, newFee);
        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo.minFee).equal(newFee);
        await setMinFee(BASE_ASSET_ID, FEE);
    })

    it('setAssetState', async () => {
        await setAssetState(BASE_ASSET_ID, false);
        const tokenInfo = await getTokenInfo(BASE_ASSET_ID);
        expect(tokenInfo.isActive).equal(false);
        await setAssetState(BASE_ASSET_ID, true);
    })

    it('stop/start bridge', async () => {
        await stopBridge();
        {
            const recordSource = await accountDataByKey(`_ia`, address(accounts.bridge));
            expect(recordSource.value).equal(false);
        }
        await startBridge();
        {
            const recordSource = await accountDataByKey(`_ia`, address(accounts.bridge));
            expect(recordSource.value).equal(true);
        }
    })

    it('setValidator', async () => {
        await setValidator(accounts.alice);
        const recordSource = await accountDataByKey(`_v`, address(accounts.bridge));
        expect(base64Normalize(recordSource.value)).equal(accountSeedToBase64(accounts.alice));
        await setValidator(accounts.validator);
    })

    it('setFeeCollector', async () => {
        await setFeeCollector(accounts.alice);
        const recordSource = await accountDataByKey(`_fc`, address(accounts.bridge));
        expect(base64Normalize(recordSource.value)).equal(accountSeedToBase64(accounts.alice));
        await setValidator(accounts.feeCollector);
    })

    it('setUnlockSigner', async () => {
        await setUnlockSigner(accounts.alice);
        const recordSource = await accountDataByKey(`_us`, address(accounts.bridge));
        expect(base64Normalize(recordSource.value)).equal(accountSeedToBase64(accounts.alice));
        await setValidator(accounts.feeCollector);
    })
})
