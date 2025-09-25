import { createHash, randomBytes } from 'node:crypto';
import { request as httpsRequest } from 'node:https';
import { URL } from 'node:url';
import type { IncomingMessage } from 'node:http';
import type { Song } from '../src/types';
import { buildSongId, parseContent } from '../src/utils/songContent';

interface UltimateGuitarTab {
  id: number;
  song_name: string;
  artist_name: string;
  tonality_name?: string;
  capo?: number;
  recording?: {
    tonality_name?: string;
  };
  content: string;
  type: string;
  urlWeb?: string;
}

export interface ImportResult {
  tabId: number;
  source: string;
  suggestedId: string;
  song: Song;
}

const API_ENDPOINT = 'https://api.ultimate-guitar.com/api/v1/tab/info';

const buildApiKey = (deviceId: string, now = new Date()) => {
  const formattedDate = `${now.toISOString().slice(0, 10)}:${now.getUTCHours()}`;
  const payload = `${deviceId}${formattedDate}createLog()`;
  return createHash('md5').update(payload).digest('hex');
};

const performRequest = (tabId: number): Promise<UltimateGuitarTab> =>
  new Promise((resolve, reject) => {
    const deviceId = randomBytes(8).toString('hex');
    const apiKey = buildApiKey(deviceId);
    const target = new URL(API_ENDPOINT);
    target.searchParams.set('tab_id', String(tabId));
    target.searchParams.set('tab_access_type', 'public');

    const req = httpsRequest(
      target,
      {
        method: 'GET',
        headers: {
          'Accept-Charset': 'utf-8',
          Accept: 'application/json',
          'User-Agent': 'UGT_ANDROID/4.11.1 (Pixel; 8.1.0)',
          Connection: 'close',
          'X-UG-CLIENT-ID': deviceId,
          'X-UG-API-KEY': apiKey,
        },
      },
      (res: IncomingMessage) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`Ultimate Guitar request failed (${res.statusCode ?? 'no status'}): ${body}`));
            return;
          }
          try {
            const parsed = JSON.parse(body) as UltimateGuitarTab;
            resolve(parsed);
          } catch (error) {
            reject(new Error(`Unable to parse Ultimate Guitar response: ${(error as Error).message}`));
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });

const normalizeContent = (content: string) =>
  content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\[tab\]/gi, '')
    .replace(/\[\/tab\]/gi, '')
    .replace(/\[ch\]([^[]+?)\[\/ch\]/gi, '[$1]')
    .replace(/\n{3,}/g, '\n\n')
    .trimEnd();

const resolveDefaultKey = (tab: UltimateGuitarTab) => {
  const keyCandidates = [tab.tonality_name, tab.recording?.tonality_name].filter(Boolean) as string[];
  return keyCandidates.find((value) => value && value.trim()) ?? 'C';
};

export const extractTabId = (source: string) => {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error('Provide a URL or tab id.');
  }
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10);
  }

  try {
    const url = new URL(trimmed);
    const fromPath = url.pathname.match(/(\d{5,})/);
    if (fromPath) {
      return Number.parseInt(fromPath[1], 10);
    }
  } catch {
    // Ignore URL parsing error, fall through to generic extraction.
  }

  const fallbackMatch = trimmed.match(/(\d{5,})/);
  if (fallbackMatch) {
    return Number.parseInt(fallbackMatch[1], 10);
  }

  throw new Error('Unable to find a tab id in the provided value.');
};

export const fetchUltimateGuitarSong = async (source: string): Promise<ImportResult> => {
  const tabId = extractTabId(source);
  const tab = await performRequest(tabId);
  if (!tab || !tab.song_name || !tab.artist_name || !tab.content) {
    throw new Error('Received an incomplete response from Ultimate Guitar.');
  }

  const normalized = normalizeContent(tab.content);
  const lines = parseContent(normalized);
  const suggestedId = buildSongId(tab.song_name, tab.artist_name);

  const song: Song = {
    id: suggestedId,
    title: tab.song_name,
    artist: tab.artist_name,
    defaultKey: resolveDefaultKey(tab),
    capo: tab.capo && Number.isFinite(tab.capo) && tab.capo > 0 ? tab.capo : undefined,
    lines,
  };

  return {
    tabId,
    source,
    suggestedId,
    song,
  };
};
