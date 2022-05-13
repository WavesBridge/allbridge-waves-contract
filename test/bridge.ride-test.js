const {toWavelet, base58ToBase64, initValidatorContract,
    initBridgeContract, getLockData, generateLockId, lock,
    setAssetState, initNativeToken, mintToken, addAsset, issueAsset, unlock, hasUnlock, stopBridge, startBridge
} = require('./utils');


const NATIVE_ASSET_SOURCE = Buffer.from("POL\0")
const NATIVE_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const NATIVE_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([NATIVE_ASSET_SOURCE, NATIVE_ASSET_ADDRESS]).toString("base64")

const WRAPPED_ASSET_SOURCE = Buffer.from("WAVE")
const WRAPPED_ASSET_ADDRESS = Buffer.from("1122334455667788990011223344556677889900", "hex")
const WRAPPED_ASSET_SOURCE_AND_ADDRESS = Buffer.concat([WRAPPED_ASSET_SOURCE, WRAPPED_ASSET_ADDRESS]).toString("base64")

const BASE_ASSET_SOURCE_AND_ADDRESS = "V0FWRVdBVkUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const BASE_ASSET_ID = "V0FWRQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

describe('Assets', async function () {

    this.timeout(100000);

    let NATIVE_ASSET_ID = "";
    let NATIVE_ASSET_ID_B58 = "";
    let WRAPPED_ASSET_ID = "";
    let WRAPPED_ASSET_ID_B58 = "";
    let ORACLE;
    const FEE = 1000000;

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            validator: toWavelet(10),
            feeCollector: toWavelet(10),
            unlockSigner: toWavelet(10),
            admin: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(100000),
            newOwner: toWavelet(10),
        });


        ORACLE = await initValidatorContract();
        await initBridgeContract();

        NATIVE_ASSET_ID_B58 = await initNativeToken();
        NATIVE_ASSET_ID = base58ToBase64(NATIVE_ASSET_ID_B58)
        await mintToken(NATIVE_ASSET_ID_B58, address(accounts.bridge), toWavelet(5), accounts.token);
        await mintToken(NATIVE_ASSET_ID_B58, address(accounts.alice), toWavelet(5), accounts.token);

        WRAPPED_ASSET_ID_B58 = await issueAsset();
        WRAPPED_ASSET_ID = base58ToBase64(WRAPPED_ASSET_ID_B58);
        await mintToken(WRAPPED_ASSET_ID_B58, address(accounts.alice), toWavelet(5), accounts.bridge);

        await addAsset(BASE_ASSET_ID, BASE_ASSET_SOURCE_AND_ADDRESS, FEE);
        await addAsset(NATIVE_ASSET_ID, NATIVE_ASSET_SOURCE_AND_ADDRESS, FEE);
        await addAsset(WRAPPED_ASSET_ID, WRAPPED_ASSET_SOURCE_AND_ADDRESS, FEE);
    });
    it('success', () => {

    })

    describe('lock', () => {
        const recipient = Buffer.from(new Array(32).fill(2)).toString('base64');
        const destination = Buffer.from("ETH\0").toString('base64');
        const amount = toWavelet(0.12);

        it ('fail: invalid lockId', async () => {
            const invalidLockId = Buffer.from([2, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
            const result = lock(recipient, destination, amount, invalidLockId)
            await expect(result).to.be.rejectedWith("invalid lockId");
        })

        it ('fail: amount too small', async () => {
            const result = lock(recipient, destination, toWavelet(0.0012))
            await expect(result).to.be.rejectedWith("not enough balance");
        })

        it ('fail: asset disabled', async () => {
            await setAssetState(BASE_ASSET_ID, false);
            const result = lock(recipient, destination, amount)
            await expect(result).to.be.rejectedWith("asset is disabled");
            await setAssetState(BASE_ASSET_ID, true);
        })

        it ('fail: bridge stopped', async () => {
            await stopBridge();
            const result = lock(recipient, destination, amount)
            await expect(result).to.be.rejectedWith("birdge is disabled");
            await startBridge();
        })

        it ('fail: wrong destination', async () => {
            const destination = Buffer.from('WAVE').toString('base64');
            const result = lock(recipient, destination, amount)
            await expect(result).to.be.rejectedWith("wrong destination chain");
        })

        it ('fail: no payments', async () => {
            const result = lock(recipient, destination, [])
            await expect(result).to.be.rejectedWith("not one payment");
        })

        it ('fail: many payments', async () => {
            const result = lock(recipient, destination, [
                {assetId: null, amount: toWavelet(1)},
                {assetId: NATIVE_ASSET_ID_B58, amount: toWavelet(1)}
            ])
            await expect(result).to.be.rejectedWith("not one payment");
        })

        it('base (fee as share)', async function () {
            const lockId = generateLockId();
            const amount = toWavelet(1000);
            const fee = amount * 30 / 10000;

            const bridgeBalanceBefore = await balance(address(accounts.bridge));
            const userBalanceBefore = await balance(address(accounts.alice));
            const feeCollectorBalanceBefore = await balance(address(accounts.feeCollector));

            const lockTx = await lock(recipient, destination, amount, lockId);

            const bridgeBalanceAfter = await balance(address(accounts.bridge));
            const userBalanceAfter = await balance(address(accounts.alice));
            const feeCollectorBalanceAfter = await balance(address(accounts.feeCollector));

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore + amount - fee);
            expect(userBalanceAfter).equal(userBalanceBefore - amount - lockTx.fee);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + fee);

            const lockData = await getLockData(lockId);

            expect(lockData).deep.equal({
                recipient: recipient,
                amount: (amount - fee) * 10, // token precision 8, system precision 9
                destination: destination,
                assetSource: BASE_ASSET_SOURCE_AND_ADDRESS
            })

            await expect(lock(recipient, destination, amount, lockId)).to.be.rejectedWith("locked");
        })

        it('native', async function () {
            const lockId = generateLockId();

            const bridgeBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
            const userBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.feeCollector)) || 0;

            await lock(recipient, destination, {assetId: NATIVE_ASSET_ID_B58, amount}, lockId);

            const bridgeBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(NATIVE_ASSET_ID_B58, address(accounts.feeCollector)) || 0;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore + amount - FEE);
            expect(userBalanceAfter).equal(userBalanceBefore - amount);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + FEE);

            const lockData = await getLockData(lockId);

            expect(lockData).deep.equal({
                recipient: recipient,
                amount: (amount - FEE) * 10, // token precision 8, system precision 9
                destination: destination,
                assetSource: NATIVE_ASSET_SOURCE_AND_ADDRESS
            })

            await expect(lock(recipient, destination, amount, lockId)).to.be.rejectedWith("locked");
        })

        it('wrapped', async function () {
            const lockId = generateLockId();

            await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.bridge)) || 0;
            const userBalanceBefore = await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.feeCollector)) || 0;

            await lock(recipient, destination, {assetId: WRAPPED_ASSET_ID_B58, amount}, lockId);

            const bridgeBalanceAfter = await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(WRAPPED_ASSET_ID_B58, address(accounts.feeCollector)) || 0;

            expect(bridgeBalanceAfter).equal(0);
            expect(userBalanceAfter).equal(userBalanceBefore - amount);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + FEE);

            const lockData = await getLockData(lockId);

            expect(lockData).deep.equal({
                recipient: recipient,
                amount: (amount - FEE) * 10, // token precision 8, system precision 9
                destination: destination,
                assetSource: WRAPPED_ASSET_SOURCE_AND_ADDRESS
            })

            await expect(lock(recipient, destination, amount, lockId)).to.be.rejectedWith("locked");
        })
    })

    describe('unlock', () => {
        const amount = 10000;
        const lockSource = Buffer.from("TRA\0").toString("base64");

        it('fail: invalid lockId', async () => {
            const tokenSourceAndAddress = BASE_ASSET_SOURCE_AND_ADDRESS;
            const invalidLockId = Buffer.from([2, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
            const result = unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, invalidLockId);
            await expect(result).to.be.rejectedWith("invalid lockId");
        })

        it('fail: invalid asset', async () => {
            const invalidTokenSource = Buffer.from([1, 2, 3, 4]).toString("base64");
            const result = unlock(amount, lockSource, invalidTokenSource, ORACLE);
            await expect(result).to.be.rejectedWith("asset not found");
        })

        it('fail: invalid signature', async () => {
            const invalidOracle = wavesCrypto.randomBytes(32);
            const result = unlock(amount, lockSource, BASE_ASSET_SOURCE_AND_ADDRESS, invalidOracle);
            await expect(result).to.be.rejectedWith("invalid signature");
        })

        it ('fail: bridge stopped', async () => {
            await stopBridge();
            const result = unlock(amount, lockSource, BASE_ASSET_SOURCE_AND_ADDRESS, ORACLE);
            await expect(result).to.be.rejectedWith("birdge is disabled");
            await startBridge();
        })

        it('base', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = BASE_ASSET_SOURCE_AND_ADDRESS;

            const bridgeBalanceBefore = await balance(address(accounts.bridge));
            const userBalanceBefore = await balance(address(accounts.alice));
            const feeCollectorBalanceBefore = await balance(address(accounts.feeCollector)) || 0;

            const unlockTx = await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId);

            const bridgeBalanceAfter = await balance(address(accounts.bridge));
            const userBalanceAfter = await balance(address(accounts.alice));
            const feeCollectorBalanceAfter = await balance(address(accounts.feeCollector)) || 0;

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - unlockTx.fee);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })

        it('base (by unlock signer)', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = BASE_ASSET_SOURCE_AND_ADDRESS;
            const amount = toWavelet(1);

            const bridgeBalanceBefore = await balance(address(accounts.bridge));
            const userBalanceBefore = await balance(address(accounts.alice));
            const feeCollectorBalanceBefore = await balance(address(accounts.feeCollector));

            await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId, undefined, undefined, accounts.unlockSigner);

            const bridgeBalanceAfter = await balance(address(accounts.bridge));
            const userBalanceAfter = await balance(address(accounts.alice));
            const feeCollectorBalanceAfter = await balance(address(accounts.feeCollector));

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - FEE);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + FEE);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })

        it('native', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = NATIVE_ASSET_SOURCE_AND_ADDRESS;
            const assetId = NATIVE_ASSET_ID_B58;

            const bridgeBalanceBefore = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceBefore = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId);

            const bridgeBalanceAfter = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })

        it('native (by unlock signer)', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = NATIVE_ASSET_SOURCE_AND_ADDRESS;
            const assetId = NATIVE_ASSET_ID_B58;
            const amount = toWavelet(1);

            const bridgeBalanceBefore = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceBefore = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId, undefined, undefined, accounts.unlockSigner);

            const bridgeBalanceAfter = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - FEE);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + FEE);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })

        it('wrapped', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = WRAPPED_ASSET_SOURCE_AND_ADDRESS;
            const assetId = WRAPPED_ASSET_ID_B58;

            const userBalanceBefore = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId);

            const bridgeBalanceAfter = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(0);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })

        it('wrapped (by unlock signer)', async function () {
            const lockId = generateLockId();
            const tokenSourceAndAddress = WRAPPED_ASSET_SOURCE_AND_ADDRESS;
            const assetId = WRAPPED_ASSET_ID_B58;
            const amount = toWavelet(1);

            const userBalanceBefore = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceBefore = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            await unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId, undefined, undefined, accounts.unlockSigner);

            const bridgeBalanceAfter = await assetBalance(assetId, address(accounts.bridge)) || 0;
            const userBalanceAfter = await assetBalance(assetId, address(accounts.alice)) || 0;
            const feeCollectorBalanceAfter = await assetBalance(assetId, address(accounts.feeCollector)) || 0;

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(0);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - FEE);
            expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + FEE);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(unlock(amount, lockSource, tokenSourceAndAddress, ORACLE, lockId)).to.be.rejectedWith("claimed");
        })
    })
})
