const {
    initValidatorContract, invokeAndWait, getSignature, hasUnlock, getLockData, accountSeedToBase64, base64Normalize,
    toWavelet
} = require('./utils');

describe('Validator', async function () {

    let ORACLE;

    before(async function () {

        await setupAccounts({
            bridge: toWavelet(0.05),
            validator: toWavelet(0.05),
            admin: toWavelet(0.05),
            alice: toWavelet(0.05),
        })
        ORACLE = await initValidatorContract(Buffer.from('0312ed38d39c522cf6b00dd4e60e1e9f99939fe3944d7fe737abdb80399ae54f', 'hex'))
        console.log('Config set');
    });

    describe('createUnlock', () => {
        const lockId = 'AWJgMbimgkbqRMNx34IitA==';
        const recipient = 'AVTsmQLTLh3Rd4m9Uj/bKvRP3KYWstDrSKsAAAAAAAA=';
        const amount = 1990000000;
        const lockSource = 'VFJBAA==';
        const tokenSourceAndAddress = 'VFJBAA4VFgcKGxMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        it('fail: caller not bridge', async () => {
            const signature = getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);
            const result = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'createUnlock',
                    arguments: [
                        {type: 'binary', value: lockId},
                        {type: 'binary', value: recipient},
                        {type: 'integer', value: amount},
                        {type: 'binary', value: lockSource},
                        {type: 'binary', value: tokenSourceAndAddress},
                        {type: 'binary', value: signature},
                    ]
                },
                accounts.alice);
            await expect(result).rejectedWith('unauthorized');
        })

        it('fail: wrong oracle', async () => {
            const signature = getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, wavesCrypto.randomBytes(32));
            const result = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'createUnlock',
                    arguments: [
                        {type: 'binary', value: lockId},
                        {type: 'binary', value: recipient},
                        {type: 'integer', value: amount},
                        {type: 'binary', value: lockSource},
                        {type: 'binary', value: tokenSourceAndAddress},
                        {type: 'binary', value: signature},
                    ]
                },
                accounts.bridge);
            await expect(result).rejectedWith('invalid signature');
        })

        it('fail: invalid data', async () => {
            const signature = getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, wavesCrypto.randomBytes(32));
            const result = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'createUnlock',
                    arguments: [
                        {type: 'binary', value: 'AWJgMbimgkbqRMNx34IitQ=='},
                        {type: 'binary', value: recipient},
                        {type: 'integer', value: amount},
                        {type: 'binary', value: lockSource},
                        {type: 'binary', value: tokenSourceAndAddress},
                        {type: 'binary', value: signature},
                    ]
                },
                accounts.bridge);
            await expect(result).rejectedWith('invalid signature');
        })

        it('fail: invalid lockId', async () => {
            const lockId = 'BWJgMbimgkbqRMNx34IitA==';
            const signature = getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, wavesCrypto.randomBytes(32));
            const result = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'createUnlock',
                    arguments: [
                        {type: 'binary', value: lockId},
                        {type: 'binary', value: recipient},
                        {type: 'integer', value: amount},
                        {type: 'binary', value: lockSource},
                        {type: 'binary', value: tokenSourceAndAddress},
                        {type: 'binary', value: signature},
                    ]
                },
                accounts.bridge);
            await expect(result).rejectedWith('invalid lockId');
        })

        it('success', async function () {
            const signature = getSignature(lockId, recipient, amount, lockSource, tokenSourceAndAddress, ORACLE);

            expect(signature).equal('q9hpSAmo+cqGGkQKQVbzykYbl+OJbmuVMpn80MC6jXB9FKJJHFnCVBFysUEOrmYFzzmXunJ6N6oVM3qWoShK5xs=');
            const params = {
                dApp: address(accounts.validator),
                functionName: 'createUnlock',
                arguments: [
                    {type: 'binary', value: lockId},
                    {type: 'binary', value: recipient},
                    {type: 'integer', value: amount},
                    {type: 'binary', value: lockSource},
                    {type: 'binary', value: tokenSourceAndAddress},
                    {type: 'binary', value: signature},
                ]
            };
            await invokeAndWait(params, accounts.bridge);

            expect(await hasUnlock(lockSource, lockId)).equal(true)

            await expect(invokeAndWait(params, accounts.bridge)).rejectedWith('claimed')
        })
    })

    describe('createLock', () => {
        const lockId = 'AWJgMbimgkbqRMNx34IitA==';
        const recipient = 'AVTsmQLTLh3Rd4m9Uj/bKvRP3KYWstDrSKsAAAAAAAA=';
        const amount = 1990000000;
        const lockDestination = 'VFJBAA==';
        const tokenSourceAndAddress = 'VFJBAA4VFgcKGxMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        it('fail: invalid lockId', async () => {
            const params = {
                dApp: address(accounts.validator),
                functionName: 'createLock',
                arguments: [
                    {type: 'binary', value: 'BWJgMbimgkbqRMNx34IitA=='},
                    {type: 'binary', value: recipient},
                    {type: 'integer', value: amount},
                    {type: 'binary', value: lockDestination},
                    {type: 'binary', value: tokenSourceAndAddress},
                ]
            };
            await expect(invokeAndWait(params, accounts.bridge)).rejectedWith('invalid lockId');
        })

        it('fail: invalid caller', async () => {
            const params = {
                dApp: address(accounts.validator),
                functionName: 'createLock',
                arguments: [
                    {type: 'binary', value: lockId},
                    {type: 'binary', value: recipient},
                    {type: 'integer', value: amount},
                    {type: 'binary', value: lockDestination},
                    {type: 'binary', value: tokenSourceAndAddress},
                ]
            };
            await expect(invokeAndWait(params, accounts.alice)).rejectedWith('unauthorized');
        })

        it('success', async () => {
            const params = {
                dApp: address(accounts.validator),
                functionName: 'createLock',
                arguments: [
                    {type: 'binary', value: lockId},
                    {type: 'binary', value: recipient},
                    {type: 'integer', value: amount},
                    {type: 'binary', value: lockDestination},
                    {type: 'binary', value: tokenSourceAndAddress},
                ]
            };
            await invokeAndWait(params, accounts.bridge);

            const lockInfo = await getLockData(lockId);

            expect(lockInfo).deep.equal({
                recipient,
                amount,
                destination: lockDestination,
                assetSource: tokenSourceAndAddress
            })

            await expect(invokeAndWait(params, accounts.bridge)).rejectedWith('locked')
        })
    })
    describe('admin', () => {
        it('success', async () => {
            await invokeAndWait({
                dApp: address(accounts.validator),
                functionName: 'setAdmin',
                arguments: [{type: 'string', value: address(accounts.alice)}]
            }, accounts.admin);

            {
                const tx = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'setOracle',
                    arguments: [{type: 'string', value: address(accounts.alice)}]
                }, accounts.admin);
                await expect(tx).rejectedWith('unauthorized');
            }

            {
                const tx = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'setBridge',
                    arguments: [{type: 'string', value: address(accounts.alice)}]
                }, accounts.admin);
                await expect(tx).rejectedWith('unauthorized');
            }

            {
                const tx = invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'setAdmin',
                    arguments: [{type: 'string', value: address(accounts.admin)}]
                }, accounts.admin);
                await expect(tx).rejectedWith('unauthorized');
            }

            await invokeAndWait({
                dApp: address(accounts.validator),
                functionName: 'setAdmin',
                arguments: [{type: 'string', value: address(accounts.admin)}]
            }, accounts.alice);

            {
                await invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'setOracle',
                    arguments: [{type: 'string', value: address(accounts.alice)}]
                }, accounts.admin);
                const data = await accountDataByKey(`_o`, address(accounts.validator));
                expect(base64Normalize(data.value)).equal(accountSeedToBase64(accounts.alice))
            }

            {
                await invokeAndWait({
                    dApp: address(accounts.validator),
                    functionName: 'setBridge',
                    arguments: [{type: 'string', value: address(accounts.alice)}]
                }, accounts.admin);
                const data = await accountDataByKey(`_b`, address(accounts.validator));
                expect(base64Normalize(data.value)).equal(accountSeedToBase64(accounts.alice))
            }

        })
    })
});
