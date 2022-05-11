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
        const lockId = "AWJgMbimgkbqRMNx34IitA==";
        const recipient = "AVTsmQLTLh3Rd4m9Uj/bKvRP3KYWstDrSKsAAAAAAAA=";
        const amount = 1990000000;
        const lockSource = "VFJBAA==";
        const tokenSourceAndAddress = "VFJBAA4VFgcKGxMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

        const signature = getSigneture(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);

        expect(signature).equal('q9hpSAmo+cqGGkQKQVbzykYbl+OJbmuVMpn80MC6jXB9FKJJHFnCVBFysUEOrmYFzzmXunJ6N6oVM3qWoShK5xs=');
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