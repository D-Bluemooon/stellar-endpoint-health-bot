const https = require('https');
const fs = require('fs');

const stellarEcosystemEndpoints = [
  "horizon.stellar.org",
  "horizon-testnet.stellar.org"
];

const CONNECTION_TIMEOUT_MS = 10000;
const LOG_FILE = 'health_report.log';

function logToFile(message) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, entry);
}

function triggerNetworkAudit() {
  stellarEcosystemEndpoints.forEach(nodeUrl => {
    const req = https.get(`https://${nodeUrl}`, (incomingStream) => {
      const statusMsg = `[Audit Log] Pinged endpoint: https://${nodeUrl} -> Status Received: ${incomingStream.statusCode}`;
      console.log(statusMsg);
      logToFile(statusMsg);
    });

    // #1: Explicit connection timeout boundaries (Closes #1)
    req.setTimeout(CONNECTION_TIMEOUT_MS, () => {
      const timeoutMsg = `[Timeout Alert] Connection to ${nodeUrl} exceeded ${CONNECTION_TIMEOUT_MS}ms, aborting request`;
      console.error(timeoutMsg);
      logToFile(timeoutMsg);
      req.destroy();
    });

    // #2: Graceful error handling without process.exit (Closes #2)
    req.on('error', (connectionException) => {
      const errorMsg = `[Critical Alert] Failed to establish handshake with ${nodeUrl}: ${connectionException.message}`;
      console.error(errorMsg);
      logToFile(errorMsg);
    });
  });
}

triggerNetworkAudit();
