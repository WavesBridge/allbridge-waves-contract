function accountSeedToBase64(accountSeed) {
    return base58ToBase64(address(accountSeed));
}

function base58ToBase64(value) {
    return Buffer.from(wavesCrypto.base58Decode(value)).toString("base64"); 
}

function toWavelet(amount) {
    return Math.floor(amount * 1e8)
}

async function broadcastAndWait(tx) {
    await broadcast(tx);
    return await waitForTx(tx.id);
}

module.exports = {
    accountSeedToBase64,
    toWavelet,
    broadcastAndWait,
    base58ToBase64
}