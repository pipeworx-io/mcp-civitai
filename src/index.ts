interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Civitai MCP.
 *
 * Keyless catalog of community AI image-generation models — Stable Diffusion
 * checkpoints, LoRAs, textual-inversion embeddings, ControlNets and more — with
 * download stats, base models (SDXL / Pony / Flux / SD 1.5), trained trigger
 * words and per-version download files. Public model metadata, no API key.
 *
 * Content policy: Civitai hosts a lot of mature/NSFW content. This pack defaults
 * to Safe-For-Work: every request sends `nsfw=false` unless the caller explicitly
 * opts in via `include_mature: true`. Each result also surfaces an `nsfw` flag.
 */


const BASE = 'https://civitai.com/api/v1';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'search_models',
    description:
      "Search Civitai's catalog of community AI image-generation models (Stable Diffusion checkpoints, LoRAs, textual-inversion embeddings, ControlNets) by text query and/or type. Returns download stats, base model (SDXL / Pony / Flux / SD 1.5), creator and trained trigger words. Defaults to Safe-For-Work (mature content excluded). Keyless.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Text search over model names/descriptions, e.g. "realistic", "anime", "pixel art".' },
        type: {
          type: 'string',
          description: 'Model type filter. One of: Checkpoint, LORA, TextualInversion, LoCon, Controlnet.',
        },
        sort: {
          type: 'string',
          description: 'Sort order: "Highest Rated", "Most Downloaded", or "Newest". Default "Most Downloaded".',
        },
        include_mature: {
          type: 'boolean',
          description: 'Include mature/NSFW models. Default false (Safe-For-Work — sends nsfw=false to the API).',
        },
        limit: { type: 'number', description: 'Number of results, 1-25. Default 10.' },
      },
    },
  },
  {
    name: 'get_model',
    description:
      'Get full details for a single Civitai model by id — description, type, creator, tags, download/rating stats, and every version with its base model, trigger words and downloadable files. Try id 4201 ("Realistic Vision V6.0 B1", a SFW checkpoint). Defaults Safe-For-Work; nsfw flag is surfaced. Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Civitai model id, e.g. 4201 (Realistic Vision), 133005 (Juggernaut XL).' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_by_type',
    description:
      'Browse the top community models of a given type on Civitai (most-downloaded first), optionally filtered to a specific base model. Great for "best SDXL checkpoints" or "top Flux LoRAs". Defaults to Safe-For-Work (mature excluded). Keyless.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Model type. One of: Checkpoint, LORA, TextualInversion, LoCon, Controlnet.',
        },
        base_model: {
          type: 'string',
          description: 'Optional base-model filter (client-side), e.g. "SDXL 1.0", "Flux.1 D", "Pony", "SD 1.5".',
        },
        include_mature: {
          type: 'boolean',
          description: 'Include mature/NSFW models. Default false (Safe-For-Work).',
        },
        limit: { type: 'number', description: 'Number of results, 1-25. Default 15.' },
      },
      required: ['type'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'search_models':
        return searchModels(args);
      case 'get_model':
        return getModel(args);
      case 'list_by_type':
        return listByType(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

// --- helpers ---------------------------------------------------------------

function stripHtml(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function cvGet(path: string, params: Record<string, string | number | boolean | undefined>): Promise<unknown> {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const url = qs ? `${BASE}${path}?${qs}` : `${BASE}${path}`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (res.status === 404) return { __notfound: true };
  if (!res.ok) return { __error: `Civitai: ${res.status} ${(await res.text()).slice(0, 200)}` };
  return res.json();
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function mapModel(raw: Record<string, unknown>, opts: { full?: boolean } = {}): Record<string, unknown> {
  const versions = Array.isArray(raw.modelVersions) ? (raw.modelVersions as Array<Record<string, unknown>>) : [];
  const v0 = versions[0] ?? {};
  const stats = (raw.stats as Record<string, unknown> | undefined) ?? {};
  const creator = (raw.creator as Record<string, unknown> | undefined) ?? {};
  const tags = Array.isArray(raw.tags) ? (raw.tags as unknown[]).filter((t) => typeof t === 'string') : [];

  if (!opts.full) {
    const tw0 = Array.isArray(v0.trainedWords) ? (v0.trainedWords as unknown[]) : [];
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      base_model: (v0.baseModel as string) ?? null,
      creator: creator.username ?? null,
      downloads: num(stats.downloadCount),
      rating: num(stats.rating),
      thumbs_up: num(stats.thumbsUpCount),
      nsfw: raw.nsfw === true,
      version_count: versions.length,
      latest_version: (v0.name as string) ?? null,
      trained_words: tw0.slice(0, 10),
    };
  }

  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    description: stripHtml(raw.description).slice(0, 600),
    creator: creator.username ?? null,
    nsfw: raw.nsfw === true,
    stats: {
      downloads: num(stats.downloadCount),
      rating: num(stats.rating),
      thumbs_up: num(stats.thumbsUpCount),
      favorites: num(stats.favoriteCount),
    },
    tags: tags.slice(0, 15),
    versions: versions.slice(0, 6).map((v) => {
      const tw = Array.isArray(v.trainedWords) ? (v.trainedWords as unknown[]) : [];
      const files = Array.isArray(v.files) ? (v.files as Array<Record<string, unknown>>) : [];
      return {
        version_id: v.id,
        name: v.name,
        base_model: (v.baseModel as string) ?? null,
        trained_words: tw.slice(0, 15),
        download_url: v.downloadUrl ?? null,
        files: files.slice(0, 5).map((f) => ({
          name: f.name,
          size_kb: num(f.sizeKB),
          type: f.type,
        })),
      };
    }),
  };
}

function clampLimit(v: unknown, def: number, max = 25): number {
  const n = typeof v === 'number' ? Math.floor(v) : def;
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

// --- tools -----------------------------------------------------------------

async function searchModels(args: Record<string, unknown>): Promise<unknown> {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  const type = typeof args.type === 'string' ? args.type.trim() : '';
  const sort = (typeof args.sort === 'string' && args.sort.trim()) || 'Most Downloaded';
  const includeMature = args.include_mature === true;
  const limit = clampLimit(args.limit, 10);

  const raw = await cvGet('/models', {
    query: query || undefined,
    types: type || undefined,
    sort,
    nsfw: includeMature ? undefined : false,
    primaryFileOnly: true,
    limit,
  });
  if ((raw as Record<string, unknown>).__error) return { error: (raw as Record<string, unknown>).__error };

  const items = Array.isArray((raw as Record<string, unknown>).items)
    ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
    : [];
  const models = items.map((m) => mapModel(m));
  return { count: models.length, sfw_only: !includeMature, models };
}

async function getModel(args: Record<string, unknown>): Promise<unknown> {
  const id = typeof args.id === 'number' ? Math.floor(args.id) : Number(args.id);
  if (!Number.isFinite(id) || id <= 0) return { error: 'provide a numeric Civitai model id', id: args.id ?? null };

  const raw = await cvGet(`/models/${id}`, {});
  if ((raw as Record<string, unknown>).__notfound) return { error: 'model not found', id };
  if ((raw as Record<string, unknown>).__error) return { error: (raw as Record<string, unknown>).__error };

  return mapModel(raw as Record<string, unknown>, { full: true });
}

async function listByType(args: Record<string, unknown>): Promise<unknown> {
  const type = typeof args.type === 'string' ? args.type.trim() : '';
  if (!type) return { error: 'provide a model type (Checkpoint, LORA, TextualInversion, LoCon, Controlnet)' };
  const baseModel = typeof args.base_model === 'string' ? args.base_model.trim() : '';
  const includeMature = args.include_mature === true;
  const limit = clampLimit(args.limit, 15);

  // Fetch extra when filtering client-side so the result set isn't starved.
  const fetchLimit = baseModel ? Math.min(limit * 3, 25) : limit;

  const raw = await cvGet('/models', {
    types: type,
    sort: 'Most Downloaded',
    nsfw: includeMature ? undefined : false,
    primaryFileOnly: true,
    limit: fetchLimit,
  });
  if ((raw as Record<string, unknown>).__error) return { error: (raw as Record<string, unknown>).__error };

  let items = Array.isArray((raw as Record<string, unknown>).items)
    ? ((raw as Record<string, unknown>).items as Array<Record<string, unknown>>)
    : [];

  if (baseModel) {
    const target = baseModel.toLowerCase();
    items = items.filter((m) => {
      const versions = Array.isArray(m.modelVersions) ? (m.modelVersions as Array<Record<string, unknown>>) : [];
      return versions.some((v) => typeof v.baseModel === 'string' && (v.baseModel as string).toLowerCase() === target);
    });
  }

  const models = items.slice(0, limit).map((m) => mapModel(m));
  return { type, base_model: baseModel || null, count: models.length, sfw_only: !includeMature, models };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
