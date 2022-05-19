const TransportNodeHid = require('@ledgerhq/hw-transport-node-hid-singleton').default;


(async function() {
    const transport = await TransportNodeHid.create();
    transport.send()
})()
