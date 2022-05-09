const {accountSeedToBase64, toWavelet, broadcastAndWait, base58ToBase64, initBridgeContract, 
    invokeAndWait, setManager, base64Normalize, getManager} = require('./utils');

describe('Manager', async function () {

    this.timeout(100000);

    let NATIVE_ASSET_ID = "";
    let NATIVE_ASSET_ID_B58 = "";
    let ADMIN = "";
    let FEE_COLLECTOR = "";
    let VALIDATOR = "";
    let ALICE = "";
    let NEW_OWNER = "";
    let UNLOCK_SIGNER = "";

    before(async function () {
        await setupAccounts({
            bridge: toWavelet(10),
            admin: toWavelet(10),
            feeCollector: toWavelet(10),
            unclokSigner: toWavelet(10),
            token: toWavelet(10),
            alice: toWavelet(10),
            validator: toWavelet(10),
            newOwner: toWavelet(10),
        });
        ADMIN = accountSeedToBase64(accounts.admin);
        VALIDATOR = accountSeedToBase64(accounts.validator);
        FEE_COLLECTOR = accountSeedToBase64(accounts.feeCollector);
        ALICE = accountSeedToBase64(accounts.alice);
        NEW_OWNER = accountSeedToBase64(accounts.newOwner);
        UNLOCK_SIGNER = accountSeedToBase64(accounts.unclokSigner);

        console.log(`Admin b64: ${ADMIN}`);
        console.log(`Alice b64: ${ALICE}`);

        await initBridgeContract();
        console.log('Admin set');
    });

    it('set admin', async function () {

        // Unauthorized to set new admin
        await expect(invokeAndWait({
            dApp: address(accounts.bridge),
            functionName: "setManager", 
            arguments: [
                {type:'string', value: 'BIRDGE_MANAGER'}, 
                {type:'binary', value: ALICE}, 
            ]
        }, accounts.alice)).to.be.rejectedWith("unauthorized");

        await expect(getManager('BRIDGE_MANAGER')).eventually.equal(ADMIN);

        // Successful admin change
        await setManager('BRIDGE_MANAGER', accounts.alice)

        // Check if new admin is saved
        await expect(getManager('BRIDGE_MANAGER')).eventually.equal(ALICE);

        await expect(setManager('BRIDGE_MANAGER', accounts.admin)).to.be.rejectedWith("unauthorized")

        // Successful change back
        await invokeAndWait({
            dApp: address(accounts.bridge),
            functionName: "setManager", 
            arguments: [
                {type:'string', value: 'BRIDGE_MANAGER'}, 
                {type:'binary', value: ADMIN}, 
            ]
        }, accounts.alice)

        await expect(getManager('BRIDGE_MANAGER')).eventually.equal(ADMIN);
    })
})
