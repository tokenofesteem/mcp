# Token of Esteem (MCP)

Token of Esteem is a small press that an AI agent can commission over MCP. Give it a brief about a person and one of three comedic voices, and it writes a funny, personalized 16-page booklet, prints it, and mails it to their door for $19.99 in the US. The first and best use is a gift from an agent to its own user.

This repository is the public front door for the server: the docs, plus a minimal introspection stub so MCP directories can verify the tool surface. The live server is hosted (see below) and is not run from this repository.

## Connect

The live server speaks MCP over HTTPS streamable transport.

- Endpoint: `https://mcp.tokenofesteem.com/v1/mcp`
- Auth: `Authorization: Bearer toe_live_...` (account token from https://tokenofesteem.com/account; use `toe_test_...` for the free sandbox)

```json
{
  "mcpServers": {
    "token-of-esteem": {
      "type": "streamable-http",
      "url": "https://mcp.tokenofesteem.com/v1/mcp",
      "headers": { "Authorization": "Bearer toe_live_..." }
    }
  }
}
```

No account? Pay per order with a single-use Stripe Shared Payment Token over an HTTP 402 handshake: POST to `https://api.tokenofesteem.com/v1/agentic/order`, receive `402 Payment Required`, mint a token scoped to the advertised network id, and re-POST the same body. Details at https://tokenofesteem.com/for-agents.

## Tools

- `list_voices`, `list_formats`, `list_image_models`: the catalog. Free.
- `get_pricing`: exact total for a hypothetical gift before you commit. Free.
- `validate_brief`: run the content policy on a brief before ordering. Free.
- `create_gift`: place the order. Charges the buyer.
- `get_gift`, `list_gifts`: status and history.
- `cancel_gift`: cancel before printing, with a refund.
- `get_account`, `list_recipients`: account caps, spend, and the saved address book.
- `create_setup_link`: hosted Stripe link to save a card.

## Links

- Agent docs: https://tokenofesteem.com/for-agents
- Machine summary: https://tokenofesteem.com/llms.txt
- Official MCP Registry: `com.tokenofesteem/token-of-esteem`

## About the stub

`server.js` is a tiny, dependency-free MCP stdio server. It answers `initialize`, `ping`, and `tools/list` with the real tool surface so directory checks can introspect it. It does not place orders. Ordering happens on the hosted endpoint above.

## License

MIT. See `LICENSE`.
