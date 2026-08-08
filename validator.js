const https = require("https");
const fs = require("fs");
const path = require("path");

// === Configuration ===
const CONNECTION_TIMEOUT_MS = 30000;       // 30-second boundary (Issue #1)
const MAX_RETRIES_PER_ENDPOINT = 2;        // graceful retry (Issue #2)
const LOG_FILE = path.join(__dirname, "diagnostic-history.log"); // Issue #3

const stellarEcosystemEndpoints = [
  "horizon.stellar.org",
  "horizon-testnet.stellar.org"
];

// === Log file helper (Issue #3) ===
function writeDiagnosticEntry(entry) {
  const timestamp = new Date().toISOString();
  const line = '[' + timestamp + '] ' + entry + '
';
  try {
    fs.appendFileSync(LOG_FILE, line, 'utf8');
  } catch (fsErr) {
    console.error('[Log Warning] Unable to persist diagnostic entry: ' + fsErr.message);
  }
}

// === Single endpoint audit with timeout + retry (Issues #1 + #2) ===
function auditEndpoint(nodeUrl, attemptCount) {
  const url = 'https://' + nodeUrl;
  const requestStart = Date.now();

  const req = https.get(url, { timeout: CONNECTION_TIMEOUT_MS }, (incomingStream) => {
    const latencyMs = Date.now() - requestStart;
    const msg = 'Pinged endpoint: ' + url + ' -> Status Received: ' + incomingStream.statusCode + ' (latency: ' + latencyMs + 'ms)';
    console.log('[Audit Log] ' + msg);
    writeDiagnosticEntry('OK ' + msg);
  });

  req.on('timeout', () => {
    req.destroy();
    const msg = 'Connection timeout after ' + CONNECTION_TIMEOUT_MS + 'ms for ' + url;
    console.warn('[Timeout Alert] ' + msg);
    writeDiagnosticEntry('TIMEOUT ' + msg);

    // Retry logic (Issue #2)
    if (attemptCount < MAX_RETRIES_PER_ENDPOINT) {
      console.log('[Retry] Attempt ' + (attemptCount + 1) + '/' + MAX_RETRIES_PER_ENDPOINT + ' for ' + url);
      setTimeout(function() { auditEndpoint(nodeUrl, attemptCount + 1); }, 2000);
    }
  });

  req.on('error', (connectionException) => {
    const msg = 'Failed to establish standard handshake with ' + nodeUrl + ': ' + connectionException.message;
    console.error('[Critical Alert] ' + msg);
    writeDiagnosticEntry('ERROR ' + msg);

    // Graceful recovery — do NOT process.exit (Issue #2)
    if (attemptCount < MAX_RETRIES_PER_ENDPOINT) {
      console.log('[Retry] Attempt ' + (attemptCount + 1) + '/' + MAX_RETRIES_PER_ENDPOINT + ' for ' + url);
      setTimeout(function() { auditEndpoint(nodeUrl, attemptCount + 1); }, 2000);
    }
  });
}

// === Main audit trigger ===
function triggerNetworkAudit() {
  const startMsg = '=== Network diagnostic audit started ===';
  console.log(startMsg);
  writeDiagnosticEntry(startMsg);

  stellarEcosystemEndpoints.forEach(function(nodeUrl) {
    auditEndpoint(nodeUrl, 1);
  });
}

triggerNetworkAudit();
