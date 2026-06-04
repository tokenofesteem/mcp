#!/usr/bin/env node
// Minimal MCP stdio server for Token of Esteem.
//
// Purpose: a public, dependency-free introspection stub so MCP directories
// (Glama and similar) can start the server and read its tool surface. It answers
// initialize, ping, and tools/list with the real tool list. It does NOT place
// orders. Live ordering runs on the hosted server at
// https://mcp.tokenofesteem.com/v1/mcp (account bearer token) or tokenless via
// https://api.tokenofesteem.com/v1/agentic/order (HTTP 402 + Stripe Shared
// Payment Token). See https://tokenofesteem.com/for-agents.

'use strict';

const PROTOCOL = '2025-06-18';
const SERVER_INFO = { name: 'Token of Esteem', version: '0.1.0' };

const TOOLS = [
  { name: 'list_voices', description: 'List the three comedic voices (Hype Man, Best Friend Roast, Conspiracy Theorist) and the cover image model each prefers. Free, no side effects. Call this first to pick a voice.' },
  { name: 'list_formats', description: 'List supported booklet formats. There is one today: manual_v1, a 16-page booklet. Free, no side effects.' },
  { name: 'list_image_models', description: 'List supported cover image models and their per-call cost. Free, no side effects.' },
  { name: 'get_pricing', description: 'Compute the exact total for a hypothetical gift (format, voice, image model, ship_to) before you commit. Free, no order is created.' },
  { name: 'validate_brief', description: 'Run the content policy on a brief without charging or ordering. Free. Call before create_gift so a refusal surfaces early.' },
  { name: 'create_gift', description: 'Place the order: write, print, and mail the booklet. Charges the buyer. The recipient may be your own user. Idempotent on idempotency_key for 24 hours.' },
  { name: 'get_gift', description: 'Return the full gift by gift_id, including status and fulfillment tracking. Free.' },
  { name: 'list_gifts', description: 'Paginated list of gifts on the account, with optional status and date filters. Free.' },
  { name: 'cancel_gift', description: 'Cancel an in-flight gift and return the refund amount. Free. Fails once the booklet has gone to print.' },
  { name: 'get_account', description: "Return this account's spending caps and month-to-date spend. Free." },
  { name: 'list_recipients', description: "Return the account's saved recipients (address book). Free." },
  { name: 'create_setup_link', description: 'Return a hosted Stripe link for the buyer to save a card or wallet to the account.' },
].map((t) => ({ ...t, inputSchema: { type: 'object' } }));

const HOSTED_NOTE =
  'This is a directory introspection stub. Live ordering runs on the hosted MCP endpoint https://mcp.tokenofesteem.com/v1/mcp (account bearer token), or tokenless via HTTP 402 at https://api.tokenofesteem.com/v1/agentic/order. See https://tokenofesteem.com/for-agents.';

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}
function ok(id, result) {
  return { jsonrpc: '2.0', id, result };
}
function err(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function handle(msg) {
  const { id, method } = msg;
  if (method === 'initialize') {
    send(ok(id, { protocolVersion: PROTOCOL, serverInfo: SERVER_INFO, capabilities: { tools: {} } }));
  } else if (method === 'ping') {
    send(ok(id, {}));
  } else if (method === 'tools/list') {
    send(ok(id, { tools: TOOLS }));
  } else if (method === 'tools/call') {
    send(ok(id, { content: [{ type: 'text', text: HOSTED_NOTE }] }));
  } else if (typeof method === 'string' && method.startsWith('notifications/')) {
    // Notifications take no response.
  } else if (id !== undefined && id !== null) {
    send(err(id, -32601, 'Method not found: ' + String(method)));
  }
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    handle(msg);
  }
});
process.stdin.on('end', () => process.exit(0));
