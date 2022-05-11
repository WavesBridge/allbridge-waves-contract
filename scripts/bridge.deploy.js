// Wallet.ride deploy script. To run execute `surfboard run path/to/script`

// wrap out script with async function to use fancy async/await syntax
(async () => {
    {
        // Functions, available in tests, also available here
        const script = compile(file('bridge.ride'));

        // You can set env varibles via cli arguments. E.g.: `surfboard run path/to/script  --variables 'dappSeed=seed phrase,secondVariable=200'`
        const dappSeed = env.BRIDGE_SEED;
        if (dappSeed == null){
            throw new Error(`Please provide dappSedd`)
        }
        //const dappSeed = env.SEED; // Or use seed phrase from surfboard.config.json
        const ssTx = setScript({
            script,
            // additionalFee: 400000 // Uncomment to raise fee in case of redeployment
        }, dappSeed);
        await broadcast(ssTx).catch(console.error);
        await waitForTx(ssTx.id).catch(console.error);;
        console.log('Bridge:', ssTx.id);
    }

    {
        // Functions, available in tests, also available here
        const script = compile(file('validator.ride'));

        // You can set env varibles via cli arguments. E.g.: `surfboard run path/to/script  --variables 'dappSeed=seed phrase,secondVariable=200'`
        const dappSeed = env.VALIDATOR_SEED;
        if (dappSeed == null){
            throw new Error(`Please provide dappSedd`)
        }
        //const dappSeed = env.SEED; // Or use seed phrase from surfboard.config.json
        const ssTx = setScript({
            script,
            // additionalFee: 400000 // Uncomment to raise fee in case of redeployment
        }, dappSeed);
        await broadcast(ssTx).catch(console.error);;
        await waitForTx(ssTx.id).catch(console.error);;
        console.log('Validator:', ssTx.id);
    }
})();
