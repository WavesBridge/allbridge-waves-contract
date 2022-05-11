
(async () => {
    const {accountSeedToBase64, base58ToBase64, invokeAndWait} = require('../test/utils.js')

    const dappSeed = env.SEED;

    const initTx = await invoke({
        dApp: address(env.VALIDATOR_SEED),
        functionName: 'setConfig',
        arguments: [
            [1],
            {type:'binary', value: accountSeedToBase64(env.BRIDGE_SEED)}, 
             {type:'binary', value: Buffer.from(env.ORACLE, 'hex').toString('base64')}]
    }, env.VALIDATOR_SEED);
    await waitForTx(initTx.id);
    console.log(initTx.id)
})();