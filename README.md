# mcp-civitai

Civitai MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1476+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `search_models` | Search Civitai's catalog of community AI image-generation models (Stable Diffusion checkpoints, LoRAs, textual-inversion embeddings, ControlNets) by text query and/or type. Returns download stats, base model (SDXL / Pony / Flux / SD 1.5), creator and trained trigger words. Defaults to Safe-For-Work (mature content excluded). Keyless. |
| `get_model` | Get full details for a single Civitai model by id — description, type, creator, tags, download/rating stats, and every version with its base model, trigger words and downloadable files. Try id 4201 ("Realistic Vision V6.0 B1", a SFW checkpoint). Defaults Safe-For-Work; nsfw flag is surfaced. Keyless. |
| `list_by_type` | Browse the top community models of a given type on Civitai (most-downloaded first), optionally filtered to a specific base model. Great for "best SDXL checkpoints" or "top Flux LoRAs". Defaults to Safe-For-Work (mature excluded). Keyless. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "civitai": {
      "url": "https://gateway.pipeworx.io/civitai/mcp"
    }
  }
}
```

### What this endpoint actually serves

`tools/list` at `https://gateway.pipeworx.io/civitai/mcp` returns the tools in the table
above **plus the shared Pipeworx meta-tools** — `ask_pipeworx`,
`discover_tools`, `search_within`, `remember`/`recall` and the rest of the
gateway-wide set. So the tool count you see is larger than this table: a
single-pack endpoint currently lists roughly 30 shared tools alongside the
pack's own. The connection's `initialize` response states its exact scope, and
is the authoritative answer for a given day.

This is deliberate, not multiplexing by accident. The meta-tools are what let a
scoped connection answer a question this pack does not cover — via
`ask_pipeworx`, which routes across the whole catalog — without you adding a
second MCP server. There is currently no way to mount a pack endpoint without
them; if the extra schemas cost you more context than the routing is worth,
connect to the full gateway once rather than to several pack endpoints.

Or connect to the full Pipeworx gateway to get every pack's tools listed
directly, instead of just this one's:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

Both URLs reach the same gateway and the same 1476+ data sources. The
only difference is which pack's tools are listed **directly**; `ask_pipeworx`
reaches all of them from either one.

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English —
this works on the pack endpoint above as well as on the full gateway:

```
ask_pipeworx({ question: "your question about Civitai data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT

## No MCP client? Call it over HTTP

```bash
curl -X POST https://gateway.pipeworx.io/v1/tools/civitai_search_models \
  -H 'Content-Type: application/json' \
  -d '{"query":"realistic portrait","type":"Checkpoint","sort":"Most Downloaded","limit":10}'
```

No account needed for the first calls. Inspect any tool: `GET https://gateway.pipeworx.io/v1/tools/civitai_search_models`. Find one: `POST https://gateway.pipeworx.io/v1/tools/search_packs` with `{"query":"..."}`.
