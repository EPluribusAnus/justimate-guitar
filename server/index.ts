import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { fetchUltimateGuitarSong } from '../scripts/ultimateGuitar';

const app = express();
app.use(express.json());

app.post('/api/ultimate-guitar/import', async (req, res) => {
  try {
    const source = typeof req.body?.source === 'string' ? req.body.source : '';
    const result = await fetchUltimateGuitarSong(source);
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || 'Unable to import from Ultimate Guitar' });
  }
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

app.use(express.static(distDir));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number.parseInt(process.env.PORT ?? '4173', 10);
const host = process.env.HOST ?? '0.0.0.0';

app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
