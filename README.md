# mcp-civitai

Civitai MCP.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Civitai data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
