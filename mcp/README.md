# OKF MCP retrieval prototype

This prototype provides bounded, read-only access to a local
`okf-bundle.json`. It is an empirical retrieval surface, not a claim of
production deployment or certification against every MCP client revision.

Run the newline-delimited JSON-RPC adapter from the repository root:

```sh
uv run --locked python -m mcp.okf_mcp_server --bundle okf-bundle.json
```

Example request:

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"okf.context_pack","arguments":{"question":"Why is YAML-LD additive to OKF 0.2?","limit":3,"max_bytes":12000}}}
```

The transport adapter exposes tool, resource and prompt-shaped JSON-RPC
methods. The tested contract is the Python retrieval core: exact record IDs,
deterministic lexical search, explicit relationship traversal, SHA-256 bundle
identity and hard byte limits. A production server should wrap this core in the
official SDK and the MCP revision supported by its target clients, then add
authentication, authorisation, structured audit and operational monitoring.
