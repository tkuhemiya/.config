import { StringEnum } from '@earendil-works/pi-ai';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Text } from '@earendil-works/pi-tui';
import type {
  ContentsOptions,
  RegularSearchOptions,
  SearchResponse,
  SearchResult,
} from 'exa-js';
import { Exa } from 'exa-js';
import { Type } from 'typebox';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const SEARCH_TYPES = [
  'auto',
  'fast',
  'instant',
  'deep-lite',
  'deep',
  'deep-reasoning',
] as const;

const CATEGORIES = [
  'company',
  'research paper',
  'news',
  'pdf',
  'github',
  'tweet',
  'personal site',
  'linkedin profile',
  'financial report',
] as const;

interface WebSearchDetails {
  query: string;
  numResults: number;
  type: string;
  resultCount: number;
  results: Array<{
    title: string | null;
    url: string;
    publishedDate?: string;
    author?: string;
    score?: number;
    highlights?: string[];
    summary?: string;
    textSnippet?: string;
  }>;
  costDollars?: { total: number };
}

interface WebGetContentsDetails {
  urls: string[];
  resultCount: number;
  results: Array<{
    title: string | null;
    url: string;
    text?: string;
    highlights?: string[];
  }>;
  costDollars?: { total: number };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExaClient() {
  const apiKey =
    process.env.EXA_API_KEY || '63417dd2-d601-4abc-b756-84e9ed43fcd9';
  return new Exa(apiKey);
}

type AnySearchResult = SearchResult<{
  text: true;
  highlights: true;
  summary: true;
}>;

function formatSearchResults(
  results: AnySearchResult[],
  maxResults: number,
): string {
  const truncated = results.slice(0, maxResults);
  if (truncated.length === 0) return 'No results found.';

  const lines: string[] = [];
  for (let i = 0; i < truncated.length; i++) {
    const r = truncated[i] as AnySearchResult;
    lines.push(`### ${i + 1}. ${r.title ?? 'Untitled'}`);
    lines.push(`**URL:** ${r.url}`);
    if (r.publishedDate) lines.push(`**Published:** ${r.publishedDate}`);
    if (r.author) lines.push(`**Author:** ${r.author}`);
    if (r.score !== undefined) lines.push(`**Score:** ${r.score.toFixed(4)}`);

    if (r.highlights && r.highlights.length > 0) {
      lines.push(`**Highlights:**`);
      for (const h of r.highlights) {
        lines.push(`> ${h}`);
      }
    }
    if (r.summary) {
      lines.push(`**Summary:** ${r.summary}`);
    }
    if (r.text) {
      const snippet =
        r.text.length > 1000 ? `${r.text.slice(0, 1000)}...` : r.text;
      lines.push(`**Text:** ${snippet}`);
    }
    lines.push('');
  }

  if (results.length > maxResults) {
    lines.push(
      `*(Showing ${maxResults} of ${results.length} results. Increase numResults to see more.)*`,
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------

export default function (pi: ExtensionAPI) {
  // Validate API key on startup
  const apiKey = '63417dd2-d601-4abc-b756-84e9ed43fcd9';
  if (!apiKey) {
    pi.on('session_start', async (_event, ctx) => {
      ctx.ui.notify(
        'Exa search: EXA_API_KEY not set. Set it in your environment or .env file.',
        'warning',
      );
    });
  }

  // -----------------------------------------------------------------------
  // Tool: web_search
  // -----------------------------------------------------------------------

  pi.registerTool({
    name: 'web_search',
    label: 'Web Search',
    description:
      "Search the web using Exa's neural search engine. Returns results with optional highlights, full text, or summaries. Supports domain filtering, date ranges, and multiple search types.",
    promptSnippet:
      "Search the web with neural search (highlights, text, or summaries). Use for discovery when you don't have specific URLs.",
    promptGuidelines: [
      'Prefer contents.highlights: true for token-efficient excerpts. Use contents.text with maxCharacters for full content.',
      "For research, use type: 'deep'/'deep-reasoning'. For quick lookups, use 'fast'/'instant'. Default: 'auto'.",
      'Use maxAgeHours: 24 for daily-fresh, 0 to livecrawl, -1 for cache-only.',
    ],
    parameters: Type.Object({
      query: Type.String({
        description: 'Search query string',
      }),
      numResults: Type.Optional(
        Type.Number({
          description: 'Number of results to return (default: 10, max: 25)',
        }),
      ),
      type: Type.Optional(
        StringEnum(SEARCH_TYPES, {
          description:
            'Search type: auto (balanced), fast (~450ms), instant (~250ms), deep-lite, deep (4-15s), deep-reasoning (12-40s). Default: auto',
        }),
      ),
      contents: Type.Optional(
        Type.Object({
          highlights: Type.Optional(
            Type.Union([
              Type.Boolean({
                description:
                  'Return query-relevant highlights (token-efficient, recommended)',
              }),
              Type.Object({
                query: Type.Optional(
                  Type.String({
                    description:
                      'Query to bias highlights toward a specific question',
                  }),
                ),
                maxCharacters: Type.Optional(
                  Type.Number({
                    description: 'Max characters for highlights',
                  }),
                ),
              }),
            ]),
          ),
          text: Type.Optional(
            Type.Union([
              Type.Boolean({ description: 'Return full page text' }),
              Type.Object({
                maxCharacters: Type.Optional(
                  Type.Number({
                    description:
                      'Max characters of text to return (recommended: 20000)',
                  }),
                ),
                includeHtmlTags: Type.Optional(
                  Type.Boolean({
                    description: 'Include HTML tags in returned text',
                  }),
                ),
              }),
            ]),
          ),
          summary: Type.Optional(
            Type.Union([
              Type.Boolean({ description: 'Return an LLM-generated summary' }),
              Type.Object({
                query: Type.Optional(
                  Type.String({
                    description:
                      'Query to bias the summary toward a specific question',
                  }),
                ),
              }),
            ]),
          ),
        }),
      ),
      maxAgeHours: Type.Optional(
        Type.Number({
          description:
            'Max age of cached content in hours. 24 = daily-fresh, 0 = always livecrawl, -1 = cache only. Omit for default behavior.',
        }),
      ),
      includeDomains: Type.Optional(
        Type.Array(Type.String(), {
          description:
            "Only include results from these domains (e.g., ['arxiv.org', 'github.com'])",
        }),
      ),
      excludeDomains: Type.Optional(
        Type.Array(Type.String(), {
          description:
            "Exclude results from these domains (e.g., ['pinterest.com'])",
        }),
      ),
      startPublishedDate: Type.Optional(
        Type.String({
          description:
            "Filter results published after this date (ISO 8601 format, e.g., '2024-01-01')",
        }),
      ),
      endPublishedDate: Type.Optional(
        Type.String({
          description:
            "Filter results published before this date (ISO 8601 format, e.g., '2024-06-01')",
        }),
      ),
      category: Type.Optional(
        StringEnum(CATEGORIES, {
          description:
            "Filter by content category (e.g., 'company', 'research paper', 'news', 'github')",
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const exa = getExaClient();
      if (!exa) {
        throw new Error(
          'EXA_API_KEY not configured. Set it in your environment: export EXA_API_KEY=your-key',
        );
      }

      const numResults = Math.min(params.numResults ?? 10, 25);

      // Build search options
      const searchOptions: RegularSearchOptions & ContentsOptions = {
        numResults,
        type: (params.type as RegularSearchOptions['type']) ?? 'auto',
      };

      // Build contents options
      if (params.contents) {
        if (params.contents.highlights !== undefined) {
          searchOptions.highlights =
            params.contents.highlights === false
              ? undefined
              : params.contents.highlights === true
                ? true
                : params.contents.highlights;
        }
        if (params.contents.text !== undefined) {
          searchOptions.text =
            params.contents.text === false
              ? undefined
              : params.contents.text === true
                ? true
                : params.contents.text;
        }
        if (params.contents.summary !== undefined) {
          searchOptions.summary =
            params.contents.summary === false
              ? undefined
              : params.contents.summary === true
                ? true
                : params.contents.summary;
        }
      }

      // maxAgeHours -> livecrawl mapping
      if (params.maxAgeHours === 0) {
        searchOptions.livecrawl = 'always';
      } else if (params.maxAgeHours === -1) {
        searchOptions.livecrawl = 'never';
      }

      // Domain filters
      if (params.includeDomains && params.includeDomains.length > 0) {
        searchOptions.includeDomains = params.includeDomains;
      }
      if (params.excludeDomains && params.excludeDomains.length > 0) {
        searchOptions.excludeDomains = params.excludeDomains;
      }

      // Date filters
      if (params.startPublishedDate) {
        searchOptions.startPublishedDate = params.startPublishedDate;
      }
      if (params.endPublishedDate) {
        searchOptions.endPublishedDate = params.endPublishedDate;
      }

      // Category
      if (params.category) {
        searchOptions.category = params.category;
      }

      // Execute search
      const response: SearchResponse<typeof searchOptions> =
        await exa.searchAndContents(params.query, searchOptions);

      const results = response.results;

      // Format for LLM
      const formatted = formatSearchResults(
        results as AnySearchResult[],
        numResults,
      );

      // Build details
      const details: WebSearchDetails = {
        query: params.query,
        numResults,
        type: searchOptions.type ?? 'auto',
        resultCount: results.length,
        results: (results as AnySearchResult[]).map((r) => ({
          title: r.title,
          url: r.url,
          publishedDate: r.publishedDate,
          author: r.author,
          score: r.score,
          highlights: r.highlights,
          summary: r.summary,
          textSnippet: r.text ? r.text.slice(0, 500) : undefined,
        })),
        costDollars: response.costDollars
          ? { total: response.costDollars.total }
          : undefined,
      };

      return {
        content: [{ type: 'text', text: formatted }],
        details,
      };
    },

    renderCall(args, theme, _context) {
      const text =
        theme.fg('toolTitle', theme.bold('web_search ')) +
        theme.fg('muted', args.query);
      const typeStr = args.type || 'auto';
      return new Text(
        text +
          `\n${theme.fg('dim', `  type: ${typeStr} • results: ${args.numResults ?? 10}`)}`,
        0,
        0,
      );
    },

    renderResult(result, _options, theme, _context) {
      const details = result.details as WebSearchDetails | undefined;
      if (!details) {
        return new Text(theme.fg('error', 'No results'), 0, 0);
      }
      return new Text(
        theme.fg('success', '✓ ') +
          theme.fg('text', `${details.resultCount} results for: `) +
          theme.fg('accent', details.query.slice(0, 80)) +
          (details.costDollars
            ? theme.fg('dim', `  ($${details.costDollars.total.toFixed(4)})`)
            : ''),
        0,
        0,
      );
    },
  });

  // -----------------------------------------------------------------------
  // Tool: web_get_contents
  // -----------------------------------------------------------------------

  pi.registerTool({
    name: 'web_get_contents',
    label: 'Get Web Contents',
    description:
      'Get clean, parsed content for URLs you already have. Unlike web_search, this extracts content from known URLs without performing a search.',
    promptSnippet:
      'Get clean, parsed content (text or highlights) for URLs you already have',
    promptGuidelines: [
      'Use highlights for token-efficient excerpts, or text with maxCharacters for full content.',
    ],
    parameters: Type.Object({
      urls: Type.Array(Type.String(), {
        description: 'Array of URLs to fetch content from',
      }),
      highlights: Type.Optional(
        Type.Union([
          Type.Boolean({
            description: 'Return query-relevant highlights (token-efficient)',
          }),
          Type.Object({
            query: Type.Optional(
              Type.String({
                description:
                  'Query to bias highlights toward a specific question',
              }),
            ),
            maxCharacters: Type.Optional(
              Type.Number({
                description: 'Max characters for highlights',
              }),
            ),
          }),
        ]),
      ),
      text: Type.Optional(
        Type.Union([
          Type.Boolean({ description: 'Return full page text' }),
          Type.Object({
            maxCharacters: Type.Optional(
              Type.Number({
                description:
                  'Max characters of text to return (recommended: 20000)',
              }),
            ),
            includeHtmlTags: Type.Optional(
              Type.Boolean({
                description: 'Include HTML tags in returned text',
              }),
            ),
          }),
        ]),
      ),
      maxAgeHours: Type.Optional(
        Type.Number({
          description:
            'Max age of cached content in hours. 24 = daily-fresh, 0 = always livecrawl, -1 = cache only.',
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const exa = getExaClient();
      if (!exa) {
        throw new Error(
          'EXA_API_KEY not configured. Set it in your environment: export EXA_API_KEY=your-key',
        );
      }

      // Build contents options
      const contentsOptions: ContentsOptions = {};

      if (params.highlights !== undefined) {
        contentsOptions.highlights =
          params.highlights === false
            ? undefined
            : params.highlights === true
              ? true
              : params.highlights;
      }
      if (params.text !== undefined) {
        contentsOptions.text =
          params.text === false
            ? undefined
            : params.text === true
              ? true
              : params.text;
      }

      // maxAgeHours -> livecrawl mapping
      if (params.maxAgeHours === 0) {
        contentsOptions.livecrawl = 'always';
      } else if (params.maxAgeHours === -1) {
        contentsOptions.livecrawl = 'never';
      }

      // Execute
      const response = await exa.getContents(params.urls, contentsOptions);

      const results = response.results;

      // Format for LLM
      const lines: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i] as AnySearchResult;
        lines.push(`### ${i + 1}. ${r.title ?? 'Untitled'}`);
        lines.push(`**URL:** ${r.url}`);

        if (r.highlights && r.highlights.length > 0) {
          lines.push(`**Highlights:**`);
          for (const h of r.highlights) {
            lines.push(`> ${h}`);
          }
        }
        if (r.text) {
          const snippet =
            r.text.length > 2000 ? `${r.text.slice(0, 2000)}...` : r.text;
          lines.push(`**Text:** ${snippet}`);
        }
        lines.push('');
      }

      const details: WebGetContentsDetails = {
        urls: params.urls,
        resultCount: results.length,
        results: (results as AnySearchResult[]).map((r) => ({
          title: r.title,
          url: r.url,
          text: r.text ? r.text.slice(0, 500) : undefined,
          highlights: r.highlights,
        })),
        costDollars: response.costDollars
          ? { total: response.costDollars.total }
          : undefined,
      };

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        details,
      };
    },

    renderCall(args, theme, _context) {
      const urlPreview =
        args.urls?.slice(0, 2).join(', ') +
        (args.urls?.length > 2 ? ` +${args.urls.length - 2} more` : '');
      return new Text(
        theme.fg('toolTitle', theme.bold('web_get_contents ')) +
          theme.fg('muted', urlPreview),
        0,
        0,
      );
    },

    renderResult(result, _options, theme, _context) {
      const details = result.details as WebGetContentsDetails | undefined;
      if (!details) {
        return new Text(theme.fg('error', 'No content'), 0, 0);
      }
      return new Text(
        theme.fg('success', '✓ ') +
          theme.fg('text', `${details.resultCount} pages fetched`) +
          (details.costDollars
            ? theme.fg('dim', `  ($${details.costDollars.total.toFixed(4)})`)
            : ''),
        0,
        0,
      );
    },
  });

  // -----------------------------------------------------------------------
  // Startup notification
  // -----------------------------------------------------------------------

  pi.on('session_start', async (_event, ctx) => {
    if (apiKey) {
      ctx.ui.notify(
        'Exa search extension loaded: web_search and web_get_contents available',
        'info',
      );
    }
  });
}
