import path from 'node:path';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { fetchUltimateGuitarSong, searchUltimateGuitar } from './ultimateGuitar';

const parseBody = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const payload = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(payload) as Record<string, unknown>);
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${(error as Error).message}`));
      }
    });
    req.on('error', reject);
  });

const handleImportRequest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const source = typeof body.source === 'string' ? body.source : '';
    const result = await fetchUltimateGuitarSong(source);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ result }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: (error as Error).message || 'Unable to import from Ultimate Guitar',
      }),
    );
  }
};

const handleSearchRequest = async (req: IncomingMessage, res: ServerResponse) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    const query = typeof body.query === 'string' ? body.query : '';
    const page = typeof body.page === 'number' && body.page > 0 ? body.page : 1;
    const limit = typeof body.limit === 'number' && body.limit > 0 && body.limit <= 25 ? body.limit : 12;
    const results = await searchUltimateGuitar(query, page, limit);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ results }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: (error as Error).message || 'Unable to search Ultimate Guitar',
      }),
    );
  }
};

const libraryFile = path.resolve(process.cwd(), 'data/library.json');
const ensureDir = (target: string) => fs.mkdir(target, { recursive: true }).catch(() => undefined);

const readLibrary = async () => {
  try {
    const raw = await fs.readFile(libraryFile, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (error) {
    return null;
  }
};

const writeLibrary = async (data: unknown) => {
  await ensureDir(path.dirname(libraryFile));
  await fs.writeFile(libraryFile, JSON.stringify({ savedAt: new Date().toISOString(), ...((data as object) ?? {}) }, null, 2), 'utf8');
};

const handleLibraryGet = async (_req: IncomingMessage, res: ServerResponse) => {
  const data = await readLibrary();
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ result: data }));
};

const handleLibrarySave = async (req: IncomingMessage, res: ServerResponse) => {
  try {
    const body = await parseBody(req);
    await writeLibrary(body);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true }));
  } catch (error) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: (error as Error).message || 'Unable to save library' }));
  }
};

const registerMiddleware = (server: {
  middlewares: {
    use: (
      handler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void,
    ) => void;
  };
}) => {
  server.middlewares.use((req, res, next) => {
    if (req.url?.startsWith('/api/ultimate-guitar/import')) {
      handleImportRequest(req, res);
      return;
    }
    if (req.url?.startsWith('/api/ultimate-guitar/search')) {
      handleSearchRequest(req, res);
      return;
    }
    if (req.url?.startsWith('/api/library')) {
      if (req.method === 'GET') {
        handleLibraryGet(req, res);
      } else if (req.method === 'POST') {
        handleLibrarySave(req, res);
      } else {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
      return;
    }
    next();
  });
};

export const ultimateGuitarPlugin = (): Plugin => ({
  name: 'ultimate-guitar-proxy',
  configureServer(server) {
    registerMiddleware(server);
  },
  configurePreviewServer(server) {
    registerMiddleware(server);
  },
});
