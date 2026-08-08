const https = require('https');

const stellarEcosystemEndpoints = [
  "horizon.stellar.org",
  "horizon-testnet.stellar.org"
];

function triggerNetworkAudit() {
  stellarEcosystemEndpoints.forEach(nodeUrl => {
    https.get(`https://${nodeUrl}`, (incomingStream) => {
      console.log(`[Audit Log] Pinged endpoint: https://${nodeUrl} -> Status Received: ${incomingStream.statusCode}`);
    }).on('error', (connectionException) => {
      console.error(`[Critical Alert] Failed to establish standard handshake with ${nodeUrl}: ${connectionException.message}`);
      process.exit(1);
    });
  });
}

triggerNetworkAudit();
