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
//
// Input schemas mirror the hosted server (packages/shared: voices.ts,
// recipient.ts, brief.ts, gift.ts, payment.ts). Kept in sync by hand because
// this stub is dependency-free.

'use strict';

const PROTOCOL = '2025-06-18';
const SERVER_INFO = { name: 'Token of Esteem', version: '0.1.0' };

// Enums, mirroring packages/shared/src/voices.ts and gift.ts.
const GIFT_STATUSES = [
  'created', 'validating', 'generating', 'output_validating', 'rendering',
  'awaiting_buyer_preview', 'queued_for_print', 'printed', 'shipped', 'delivered',
  'held', 'refused', 'cancelled', 'failed',
];
const VOICE_IDS = ['hype_man', 'best_friend', 'conspiracy'];
const TONE_IDS = ['warm_with_ribbing', 'warm_only', 'deep_appreciation'];
const FORMAT_IDS = ['manual_v1'];
const IMAGE_MODEL_IDS = [
  'flux_2_pro', 'imagen_4', 'ideogram_3', 'recraft_v4', 'gpt_image_2', 'nano_banana_2',
];

const NAME_PATTERN = "^[a-zA-Z\\s'-]+$";

// Reusable object schemas (mirror recipient.ts ShipToSchema + brief.ts BriefSchema).
const SHIP_TO_SCHEMA = {
  type: 'object',
  description: 'Shipping address. The hosted server validates these fields at order time.',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100, description: 'Full name for the shipping label.' },
    line1: { type: 'string', minLength: 1, maxLength: 120, description: 'Street address, line 1.' },
    line2: { type: 'string', maxLength: 120, description: 'Street address, line 2. Optional.' },
    city: { type: 'string', minLength: 1, maxLength: 60, description: 'City.' },
    region: { type: 'string', minLength: 1, maxLength: 60, description: 'State, province, or region.' },
    postal_code: { type: 'string', minLength: 1, maxLength: 20, description: 'Postal or ZIP code.' },
    country: { type: 'string', minLength: 2, maxLength: 2, pattern: '^[A-Z]{2}$', description: 'ISO-3166 alpha-2 country code, uppercase. For example US.' },
    phone: { type: 'string', maxLength: 30, description: 'Optional contact phone for the carrier.' },
  },
  required: ['name', 'line1', 'city', 'region', 'postal_code', 'country'],
  additionalProperties: false,
};

const BRIEF_SCHEMA = {
  type: 'object',
  description: 'Structured brief about the recipient that drives the manuscript.',
  properties: {
    recipient_first_name: { type: 'string', minLength: 1, maxLength: 40, pattern: NAME_PATTERN, description: "The recipient's first name, used throughout the booklet. Letters, spaces, hyphens, and apostrophes only." },
    voice: { type: 'string', enum: VOICE_IDS, description: 'Comedic voice for the booklet: hype_man, best_friend, or conspiracy.' },
    tone: { type: 'string', enum: TONE_IDS, description: 'Overall tone: warm_with_ribbing, warm_only, or deep_appreciation.' },
    celebrate: { type: 'array', minItems: 2, maxItems: 8, items: { type: 'string', minLength: 4, maxLength: 140 }, description: 'Two to eight things genuinely worth celebrating about the recipient.' },
    tease_gently: { type: 'array', maxItems: 6, default: [], items: { type: 'string', minLength: 4, maxLength: 140 }, description: 'Up to six things to tease the recipient about, gently. Must be empty when tone is warm_only.' },
    in_jokes: { type: 'array', maxItems: 6, default: [], items: { type: 'string', minLength: 4, maxLength: 200 }, description: 'Up to six inside jokes worth referencing.' },
    do_not_mention: { type: 'array', maxItems: 8, default: [], items: { type: 'string', minLength: 1, maxLength: 60 }, description: 'Up to eight topics to avoid entirely.' },
    image_brief: { type: 'string', maxLength: 300, description: 'Optional art direction for the cover image.' },
    image_model: { type: 'string', enum: IMAGE_MODEL_IDS, description: 'Optional cover image model id for the cover art.' },
  },
  required: ['recipient_first_name', 'voice', 'tone', 'celebrate'],
  additionalProperties: false,
};

const RECIPIENT_SCHEMA = {
  description: 'Who receives the booklet and where to mail it. Pass a saved recipient_id, or an inline first_name plus ship_to.',
  oneOf: [
    {
      type: 'object',
      properties: { recipient_id: { type: 'string', minLength: 1, description: 'Id of a saved recipient (address book) to ship to.' } },
      required: ['recipient_id'],
      additionalProperties: false,
    },
    {
      type: 'object',
      properties: {
        first_name: { type: 'string', minLength: 1, maxLength: 40, pattern: NAME_PATTERN, description: "Recipient's first name. Letters, spaces, hyphens, and apostrophes only." },
        ship_to: SHIP_TO_SCHEMA,
      },
      required: ['first_name', 'ship_to'],
      additionalProperties: false,
    },
  ],
};

const TOOLS = [
  { name: 'list_voices', description: 'List the three comedic voices (Hype Man, Best Friend Roast, Conspiracy Theorist) and the cover image model each prefers. Free, no side effects. Call this first to pick a voice.' },
  { name: 'list_formats', description: 'List supported booklet formats. There is one today: manual_v1, a 16-page booklet. Free, no side effects.' },
  { name: 'list_image_models', description: 'List supported cover image models and their per-call cost. Free, no side effects.' },
  {
    name: 'get_pricing',
    description: 'Compute the exact total for a hypothetical gift (format, voice, image model, ship_to) before you commit. Free, no order is created.',
    inputSchema: {
      type: 'object',
      properties: {
        format: { type: 'string', enum: FORMAT_IDS, default: 'manual_v1', description: 'Booklet format to price. Only manual_v1 is supported today.' },
        ship_to: { ...SHIP_TO_SCHEMA, description: 'Destination address. The total and tax depend on the destination.' },
        voice: { type: 'string', enum: VOICE_IDS, description: 'Optional comedic voice. It does not change the price; accepted for parity with create_gift.' },
        image_model: { type: 'string', description: 'Optional cover image model id. Some models add a small per-call cost.' },
      },
      required: ['ship_to'],
      additionalProperties: false,
    },
  },
  {
    name: 'validate_brief',
    description: 'Run the content policy on a brief without charging or ordering. Free. Call before create_gift so a refusal surfaces early.',
    inputSchema: {
      type: 'object',
      properties: {
        brief: { ...BRIEF_SCHEMA, description: 'The same brief you would pass to create_gift. It is checked against the content policy, free, with no order created.' },
      },
      required: ['brief'],
      additionalProperties: false,
    },
  },
  {
    name: 'create_gift',
    description: 'Place the order: write, print, and mail the booklet. Charges the buyer. The recipient may be your own user. Idempotent on idempotency_key for 24 hours.',
    inputSchema: {
      type: 'object',
      properties: {
        idempotency_key: { type: 'string', minLength: 8, maxLength: 64, description: 'Caller-chosen key that makes this order idempotent for 24 hours. Reuse the same key to retry safely without charging twice.' },
        format: { type: 'string', enum: FORMAT_IDS, default: 'manual_v1', description: 'Booklet format. Only manual_v1, a 16-page booklet, is supported today.' },
        brief: { ...BRIEF_SCHEMA, description: 'Structured brief about the recipient: what to celebrate, what to tease gently, and the inside jokes worth knowing.' },
        recipient: RECIPIENT_SCHEMA,
        preview_before_print: { type: 'boolean', default: false, description: 'If true, the gift pauses for buyer review before printing instead of printing automatically.' },
        agent_note: { type: 'string', maxLength: 500, description: 'Optional note from the agent, stored with the order for support. Never printed in the booklet.' },
        shared_payment_token: { type: 'string', pattern: '^spt_', description: 'Single-use Stripe Shared Payment Token (spt_...) to pay without a stored card. Omit to charge the account default.' },
      },
      required: ['idempotency_key', 'brief', 'recipient'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_gift',
    description: 'Return the full gift by gift_id, including status and fulfillment tracking. Free.',
    inputSchema: {
      type: 'object',
      properties: {
        gift_id: { type: 'string', description: 'The gift_id returned by create_gift, identifying the order to fetch.' },
      },
      required: ['gift_id'],
      additionalProperties: false,
    },
  },
  {
    name: 'list_gifts',
    description: 'Paginated list of gifts on the account, with optional status and date filters. Free.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: GIFT_STATUSES, description: 'Only return gifts in this status, for example shipped, delivered, or cancelled.' },
        since: { type: 'string', format: 'date-time', description: 'Only return gifts created at or after this ISO 8601 timestamp.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 50, description: 'Maximum number of gifts to return, 1 to 100. Defaults to 50.' },
        cursor: { type: 'string', description: 'Opaque pagination cursor from a previous list_gifts response.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'cancel_gift',
    description: 'Cancel an in-flight gift and return the refund amount. Free. Fails once the booklet has gone to print.',
    inputSchema: {
      type: 'object',
      properties: {
        gift_id: { type: 'string', description: 'The gift_id returned by create_gift, identifying the order to cancel.' },
        reason: { type: 'string', maxLength: 200, description: 'Optional human-readable reason for the cancellation, recorded on the order.' },
      },
      required: ['gift_id'],
      additionalProperties: false,
    },
  },
  { name: 'get_account', description: "Return this account's spending caps and month-to-date spend. Free." },
  { name: 'list_recipients', description: "Return the account's saved recipients (address book). Free." },
  {
    name: 'create_setup_link',
    description: 'Return a hosted Stripe link for the buyer to save a card or wallet to the account.',
    inputSchema: {
      type: 'object',
      properties: {
        return_url: { type: 'string', format: 'uri', description: 'Optional URL to send the buyer back to after they save a card or wallet. Defaults to the account page.' },
      },
      additionalProperties: false,
    },
  },
].map((t) => ({ inputSchema: { type: 'object' }, ...t }));

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
