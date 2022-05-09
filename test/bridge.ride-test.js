const { base64Decode } = require('@waves/ts-lib-crypto');
const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64, initValidatorContract, 
    initBridgeContract, getLockData, base64ToString, getSigneture, invokeAndWait, clone} = require('./utils');


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
    let NEW_OWNER = "";
    let VALIDATOR = "";
    let BRIDGE = "";
    let FEE_COLLECTOR = "";
    let UNLOCK_SIGNER = "";
    let ORACLE;

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            validator: toWavelet(10),
            feeCollector: toWavelet(10),
            unclokSigner: toWavelet(10),
            admin: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            newOwner: toWavelet(10),
        });
        ADMIN = accountSeedToBase64(accounts.admin);
        ALICE = accountSeedToBase64(accounts.alice);
        VALIDATOR = accountSeedToBase64(accounts.validator)
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);
        BRIDGE = accountSeedToBase64(accounts.bridge);
        FEE_COLLECTOR = accountSeedToBase64(accounts.feeCollector);
        UNLOCK_SIGNER = accountSeedToBase64(accounts.unclokSigner);

        ORACLE = await initValidatorContract();
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

    it('set config', async function () {
        // TODO
    })
    describe('lock', () => {
        it('lock', async function () {
            const fee = 1000000;
            await invokeAndWait({dApp: address(accounts.bridge), functionName: 'addAsset', arguments: [
                base64Decode(BASE_ASSET_SOURCE_AND_ADDRESS), base64Decode(BASE_ASSET_ID), TYPE_BASE, "", "", 8, fee
            ]}, accounts.admin);
            
            const lockId = Buffer.from(new Array(16).fill(1)).toString('base64')
            const recipient = Buffer.from(new Array(32).fill(2)).toString('base64');
            const destination = Buffer.from("ETH\0").toString('base64');
            const amount = toWavelet(0.12)

            const bridgeBalanceBefore = await balance(address(accounts.bridge));
            const userBalanceBefore = await balance(address(accounts.alice));
            const feeCollectorBalanceBefore = await balance(address(accounts.feeCollector));

            const params = {
                dApp: address(accounts.bridge), 
                functionName: 'lock',
                arguments: [
                    {type:'binary', value: lockId},
                    {type:'binary', value: recipient},
                    {type:'binary', value: destination},
                ],
                payment: amount
            }

            const invalidLockIdArgs = clone(params);
            invalidLockIdArgs.arguments[0].value = Buffer.from([2, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
            await expect(invoke(invalidLockIdArgs, accounts.admin)).to.be.rejectedWith("invalid lockId");
            
            const amountTooLowArgs = clone(params);
            amountTooLowArgs.payment = toWavelet(0.0012);
            await expect(invoke(amountTooLowArgs, accounts.admin)).to.be.rejectedWith("not enough balance");

            
            const lockTx = await invokeAndWait(params, accounts.alice);

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

            await expect(invoke(params, accounts.admin)).to.be.rejectedWith("locked");

        })
    })

    describe('unlock', () => {
        it('success', async function () {
            const lockId = Buffer.from([1, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
            const recipient = ALICE;
            const amount = 10000;
            const lockSource = Buffer.from([44, 45, 46, 44]).toString("base64");
            const tokenSourceAndAddress = BASE_ASSET_SOURCE_AND_ADDRESS;
            const signature = getSigneture(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);

            const bridgeBalanceBefore = await balance(address(accounts.bridge));
            const userBalanceBefore = await balance(address(accounts.alice));

            const params = {
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
            }
            
            const invalidLockIdArgs = clone(params);
            invalidLockIdArgs.arguments[0].value = Buffer.from([2, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
            await expect(invoke(invalidLockIdArgs, accounts.admin)).to.be.rejectedWith("invalid lockId");

            const invalidTokenArgs = clone(params);
            const invalidTokeSource = Buffer.from([1, 2, 3, 4]).toString("base64");
            invalidTokenArgs.arguments[4].value =invalidTokeSource ;
            invalidTokenArgs.arguments[5].value = getSigneture(lockId, recipient, amount, lockSource, invalidTokeSource, ORACLE);
            await expect(invoke(invalidTokenArgs, accounts.admin)).to.be.rejectedWith("asset not found");

            const invalidSignatureArgs = clone(params);
            invalidSignatureArgs.arguments[2].value = 2000;
            await expect(invoke(invalidSignatureArgs, accounts.admin)).to.be.rejectedWith("invalid signature");

            const unlockTx = await invokeAndWait(params, accounts.alice);

            const bridgeBalanceAfter = await balance(address(accounts.bridge));
            const userBalanceAfter = await balance(address(accounts.alice));

            const tokenPrecisionAmount = amount / 10;

            expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
            expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - unlockTx.fee);

            let unlock = await accountDataByKey(`${lockSource}_${lockId}_u`, address(accounts.validator));
            expect(unlock.value).equal(true)

            await expect(invoke(params, accounts.admin)).to.be.rejectedWith("claimed");
        })
    })
})
