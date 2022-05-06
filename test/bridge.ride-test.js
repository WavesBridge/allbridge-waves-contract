const { base64Decode, base58Decode } = require('@waves/ts-lib-crypto');
const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64, initValidatorContract, 
    initBridgeContract, getLockData, base64ToString} = require('./utils');
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
    let NEW_OWNER = "";
    let VALIDATOR = "";
    let BRIDGE = "";
    let FEE_COLLECTOR = "";
    let UNLOCK_SIGNER = "";
    const oracle = wavesCrypto.randomBytes(32);

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

        const oraclePublicKey = eth.privateToPublic(Buffer.from(oracle)).toString("base64");
        await initValidatorContract(oraclePublicKey);
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

    it('lock', async function () {
        const fee = 1000000;
        const addTokenTx = await invoke({dApp: address(accounts.bridge), functionName: 'addAsset', arguments: [
            base64Decode(BASE_ASSET_SOURCE_AND_ADDRESS), base64Decode(BASE_ASSET_ID), TYPE_BASE, "", "", 8, fee
        ]}, accounts.admin);
        await waitForTx(addTokenTx.id);

        const lockId = Buffer.from(new Array(16).fill(1))
        const recipient = Buffer.from(new Array(32).fill(2));
        const destination = Buffer.from("ETH\0");
        const amount = toWavelet(0.12)

        const bridgeBalanceBefore = await balance(address(accounts.bridge));
        const userBalanceBefore = await balance(address(accounts.alice));
        const feeCollectorBalanceBefore = await balance(address(accounts.feeCollector));

        const lockTx = await invoke({
            dApp: address(accounts.bridge), 
            functionName: 'lock',
            arguments: [lockId, recipient, destination],
            payment: amount
        }, accounts.alice);
        await waitForTx(lockTx.id);

        const bridgeBalanceAfter = await balance(address(accounts.bridge));
        const userBalanceAfter = await balance(address(accounts.alice));
        const feeCollectorBalanceAfter = await balance(address(accounts.feeCollector));

        expect(bridgeBalanceAfter).equal(bridgeBalanceBefore + amount - fee);
        expect(userBalanceAfter).equal(userBalanceBefore - amount - lockTx.fee);
        expect(feeCollectorBalanceAfter).equal(feeCollectorBalanceBefore + fee);

        const lockData = await getLockData(lockId);

        expect(lockData).deep.equal({
            recipient: recipient.toString('hex'),
            amount: (amount - fee) * 10, // token precision 8, system precision 9
            destination: destination.toString(),
            assetSource: base64ToString(BASE_ASSET_SOURCE_AND_ADDRESS)
        })
    })

    it('unlock', async function () {
        const lockId = Buffer.from([1, 11, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
        const recipient = ALICE;
        const amount = 10000;
        const lockSource = Buffer.from([44, 45, 46, 44]).toString("base64");
        const tokenSourceAndAddress = BASE_ASSET_SOURCE_AND_ADDRESS;
        
        const message = [lockId, recipient, amount, lockSource, tokenSourceAndAddress].join('_');
        const hashBuffer = wavesCrypto.keccak(Buffer.from(message, "utf-8"));
        const sign = eth.ecsign(hashBuffer, oracle);
        const signatureHex = eth.toRpcSig(sign.v, sign.r, sign.s)

        const signature = Buffer.from(signatureHex.slice(2), "hex").toString("base64");

        const bridgeBalanceBefore = await balance(address(accounts.bridge));
        const userBalanceBefore = await balance(address(accounts.alice));

        const unlockTx = await invoke({
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
        }, accounts.alice);
        await waitForTx(unlockTx.id);

        const bridgeBalanceAfter = await balance(address(accounts.bridge));
        const userBalanceAfter = await balance(address(accounts.alice));

        const tokenPrecisionAmount = amount / 10;

        expect(bridgeBalanceAfter).equal(bridgeBalanceBefore - tokenPrecisionAmount);
        expect(userBalanceAfter).equal(userBalanceBefore + tokenPrecisionAmount - unlockTx.fee);

        let unlock = await accountDataByKey(`${lockSource}_${lockId}_u`, address(accounts.validator));
        expect(unlock.value).equal(true)

    })
})
