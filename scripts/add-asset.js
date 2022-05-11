
(async () => {
    const {accountSeedToBase64, base58ToBase64, broadcastAndWait} = require('../test/utils.js')
    
    const source = 'VFJBAA4VFgcKGxMBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    
    const params = {
        dApp: address(env.BRIDGE_SEED),
        call: {
            function: "addAsset",
            args: [
                {type:'binary', value: source},
                {type:'binary', value: ""},
                {type:'integer', value: 2},
                {type:'string', value: "Luna"},
                {type:'string', value: "Terra Luna"},
                {type:'integer', value: 8},
                {type:'integer', value: 1000000},
            ]
        },
        fee: "100500000"
    };


    const tx = invokeScript(params, env.MANAGER_SEED);
    console.log(tx.id);
    await broadcastAndWait(tx)
    console.log("Done");

})();