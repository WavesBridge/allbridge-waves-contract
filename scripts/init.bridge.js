
(async () => {
    const {accountSeedToBase64, base58ToBase64, invokeAndWait} = require('../test/utils.js')

    
    const initTx = await invoke({
        dApp: address(env.BRIDGE_SEED),
        functionName: "setConfig", 
        arguments: [{type:'binary', value: accountSeedToBase64(env.MANAGER_SEED)}, 
                    {type:'binary', value: accountSeedToBase64(env.VALIDATOR_SEED)},
                    {type:'binary', value: base58ToBase64(env.FEE_COLLECTOR)},
                    {type:'binary', value: base58ToBase64(env.UNLOCK_SIGNER)},
                    {type:'integer', value: 30}],
    }, env.MANAGER_SEED).catch(console.error)

    await waitForTx(initTx.id).catch(console.error);

    await invokeAndWait({
        dApp: address(env.BRIDGE_SEED),
        functionName: "setManager",
        arguments: [
            {type: 'string', value: 'ASSET_MANAGER'},
            {type: 'binary', value: accountSeedToBase64(env.MANAGER_SEED)}
        ] 
    }, env.MANAGER_SEED)

    await invokeAndWait({
        dApp: address(env.BRIDGE_SEED),
        functionName: "setManager",
        arguments: [
            {type: 'string', value: "STOP_MANAGER"},
            {type: 'binary', value: accountSeedToBase64(env.MANAGER_SEED)}
        ] 
    }, env.MANAGER_SEED)


})();