const wvs = 10 ** 8;

describe('Bridge', async() => {
    before(async () => {
        await setupAccounts({
            bridge: 0.05 * wvs,
            assets: (10 * wvs).toString(),
            admin: (10 * wvs).toString(),
            token: 0.05 * wvs,
            alice: (10 * wvs).toString(),
        });
        const script = compile(file('bridge.ride'));
        const ssTx = setScript({script}, accounts.bridge);
        await broadcast(ssTx);
        await waitForTx(ssTx.id);
        
        const script2 = compile(file('assets.ride'));
        const ssTx2 = setScript({script: script2}, accounts.assets);
        await broadcast(ssTx2);
        await waitForTx(ssTx2.id);
    })

    it('test', async function () {
        const base64 = Buffer.from(wavesCrypto.base58Decode(address(accounts.bridge))).toString("base64");
        const txSuccess = invokeScript({
            dApp: address(accounts.assets),
            call: {function: "removeAsset", args: [
                {type:'binary', value: base64},
                {type:'binary', value: base64}
            ]},
        }, accounts.admin);
        
        const br = await broadcast(txSuccess);
        const w = await waitForTx(txSuccess.id);
        let a = await accountDataByKey(`TEST`, address(accounts.assets));
        let b = await accountDataByKey(`TEST2`, address(accounts.assets));
        console.log(a);
        console.log(b);
    })
})