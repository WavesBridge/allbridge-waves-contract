const eth = require('ethereumjs-util');
const crypto = require('crypto');
const { initValidatorContract, invokeAndWait, getSigneture } = require('./utils');

const wvs = 10 ** 8;

const VERSION = Buffer.from([1]).toString("base64");

describe('Validator', async function () {

    let ADMIN = "";
    let BRIDGE = "";
    let ORACLE;

    before(async function () {
        await setupAccounts({
            bridge: 0.05 * wvs,
            validator: 0.05 * wvs,
            admin: 0.05 * wvs,
            alice: 0.05 * wvs,
        });
        ORACLE = await initValidatorContract(Buffer.from('0312ed38d39c522cf6b00dd4e60e1e9f99939fe3944d7fe737abdb80399ae54f', 'hex'))
        console.log('Config set');
    });

    it('create unlock', async function () {
        const lockId = Buffer.from([1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]).toString("base64");
        const recipient = Buffer.from([22, 33, 44]).toString("base64");
        const amount = 1000;
        const lockSource = Buffer.from([11, 22, 33, 44]).toString("base64");
        const tokenSourceAndAddress = Buffer.from([11, 22, 33, 44, 55]).toString("base64");

        const signature = getSigneture(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);

        await invokeAndWait({
            dApp: address(accounts.validator),
            functionName: "createUnlock", 
            arguments: [
                {type:'binary', value: lockId},
                {type:'binary', value: recipient},
                {type:'integer', value: amount},
                {type:'binary', value: lockSource},
                {type:'binary', value: tokenSourceAndAddress},
                {type:'binary', value: signature},
            ]},
        accounts.bridge);
    });

    it('test', async function () {
        const lockId = "AWJgMbimgkbqRMNx34IitA==";
        const recipient = "AVTsmQLTLh3Rd4m9Uj/bKvRP3KYWstDrSKsAAAAAAAA=";
        const amount = 1990000000;
        const lockSource = "VFJBAA==";
        const tokenSourceAndAddress = "VFJBAA4VFgcKGxMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        const signature = getSigneture(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);

        console.log('Signature', signature);
        await invokeAndWait({
            dApp: address(accounts.validator),
            functionName: "createUnlock", 
            arguments: [
                {type:'binary', value: lockId},
                {type:'binary', value: recipient},
                {type:'integer', value: amount},
                {type:'binary', value: lockSource},
                {type:'binary', value: tokenSourceAndAddress},
                {type:'binary', value: signature},
            ]},
        accounts.bridge);
    })
});