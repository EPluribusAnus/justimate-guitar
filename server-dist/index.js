// server/index.ts
import path from "path";
import { fileURLToPath } from "url";
import express from "express";

// scripts/ultimateGuitar.ts
import { createHash, randomBytes } from "crypto";
import { request as httpsRequest } from "https";
import { URL } from "url";

// src/utils/chords.ts
var NOTE_SEQUENCE = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
var NOTE_INDEX = Object.fromEntries(
  NOTE_SEQUENCE.map((note, index) => [note, index])
);
var FLAT_TO_SHARP = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  Cb: "B",
  Fb: "E"
};
var parseChord = (symbol) => {
  if (!symbol.trim()) {
    return null;
  }
  const [chordPart, bassPart] = symbol.split("/");
  const match = chordPart.trim().match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match) {
    return null;
  }
  const [, rawRoot, rawSuffix] = match;
  const prefersFlat = rawRoot.includes("b");
  const root = normalizeNote(rawRoot);
  if (!root) {
    return null;
  }
  const suffix = rawSuffix.trim();
  const quality = getChordQuality(suffix);
  const normalizedBass = bassPart ? normalizeNote(bassPart.trim()) : void 0;
  const bass = normalizedBass ?? void 0;
  return {
    root,
    suffix,
    bass,
    quality,
    prefersFlat
  };
};
var normalizeNote = (note) => {
  const cleaned = note.trim();
  if (NOTE_INDEX[cleaned] !== void 0) {
    return cleaned;
  }
  const formatted = cleaned.replace("\u266D", "b").replace("\u266F", "#");
  if (NOTE_INDEX[formatted] !== void 0) {
    return formatted;
  }
  const sharp = FLAT_TO_SHARP[formatted];
  if (sharp && NOTE_INDEX[sharp] !== void 0) {
    return sharp;
  }
  return null;
};
var getChordQuality = (suffix) => {
  const lower = suffix.toLowerCase();
  if (!lower) {
    return "maj";
  }
  if (lower === "m" || lower.startsWith("min") || lower.startsWith("-")) {
    if (lower.startsWith("m7b5") || lower.startsWith("min7b5") || lower.startsWith("\xF8")) {
      return "m7b5";
    }
    if (lower.startsWith("m7") || lower.startsWith("min7")) {
      return "m7";
    }
    return "m";
  }
  if (lower.startsWith("maj7") || lower.startsWith("ma7")) {
    return "maj7";
  }
  if (lower.startsWith("maj")) {
    return "maj";
  }
  if (lower.startsWith("7sus4")) {
    return "7sus4";
  }
  if (lower.startsWith("sus2")) {
    return "sus2";
  }
  if (lower.startsWith("sus4") || lower.startsWith("sus")) {
    return "sus4";
  }
  if (lower.startsWith("add9")) {
    return "add9";
  }
  if (lower.startsWith("dim7")) {
    return "dim7";
  }
  if (lower.startsWith("dim") || lower.startsWith("\xB0")) {
    return "dim";
  }
  if (lower.startsWith("aug") || lower.startsWith("+")) {
    return "aug";
  }
  if (lower.startsWith("m7") || lower.startsWith("min7")) {
    return "m7";
  }
  if (lower.startsWith("m7b5") || lower.startsWith("min7b5")) {
    return "m7b5";
  }
  if (lower.startsWith("m9")) {
    return "m7";
  }
  if (lower.startsWith("9") || lower.startsWith("11") || lower.startsWith("13")) {
    return "7";
  }
  if (lower.startsWith("7")) {
    return "7";
  }
  return "unknown";
};

// src/utils/lyrics.ts
var sanitizeChordToken = (token) => token.replace(/[|()[\]]/g, "").trim();
var isLikelyChordToken = (token) => {
  const cleaned = sanitizeChordToken(token);
  if (!cleaned) {
    return false;
  }
  return Boolean(parseChord(cleaned));
};
var isLikelyChordGuideLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return false;
  }
  const chordTokenCount = tokens.filter((token) => isLikelyChordToken(token)).length;
  if (!chordTokenCount) {
    return false;
  }
  if (tokens.length === 1) {
    return chordTokenCount === 1;
  }
  return chordTokenCount / tokens.length >= 0.6;
};

// src/utils/songContent.ts
var slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
var buildSongId = (title, artist) => {
  const base = `${slugify(artist)}-${slugify(title)}`.replace(/^-+|-+$/g, "");
  const fallback = slugify(title) || "song";
  return base || fallback;
};
var parseContent = (content) => {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const result = [];
  let pendingChordGuide = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (pendingChordGuide !== null) {
        result.push({ type: "line", content: "", chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      if (result[result.length - 1]?.type !== "spacer") {
        result.push({ type: "spacer" });
      }
      return;
    }
    const sectionFromBrackets = trimmed.match(/^\[(.+)\]$/);
    if (sectionFromBrackets) {
      if (pendingChordGuide !== null) {
        result.push({ type: "line", content: "", chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      const label = sectionFromBrackets[1].trim() || "Section";
      result.push({ type: "section", label });
      return;
    }
    if (trimmed.startsWith("#")) {
      if (pendingChordGuide !== null) {
        result.push({ type: "line", content: "", chords: pendingChordGuide });
        pendingChordGuide = null;
      }
      const label = line.replace(/^#+/, "").trim() || "Section";
      result.push({ type: "section", label });
      return;
    }
    if (isLikelyChordGuideLine(line)) {
      if (pendingChordGuide !== null) {
        result.push({ type: "line", content: "", chords: pendingChordGuide });
      }
      pendingChordGuide = line;
      return;
    }
    if (pendingChordGuide !== null) {
      result.push({ type: "line", content: line, chords: pendingChordGuide });
      pendingChordGuide = null;
    } else {
      result.push({ type: "line", content: line });
    }
  });
  if (pendingChordGuide !== null) {
    result.push({ type: "line", content: "", chords: pendingChordGuide });
  }
  return result;
};

// scripts/ultimateGuitar.ts
var API_ENDPOINT = "https://api.ultimate-guitar.com/api/v1/tab/info";
var buildApiKey = (deviceId, now = /* @__PURE__ */ new Date()) => {
  const formattedDate = `${now.toISOString().slice(0, 10)}:${now.getUTCHours()}`;
  const payload = `${deviceId}${formattedDate}createLog()`;
  return createHash("md5").update(payload).digest("hex");
};
var performRequest = (tabId) => new Promise((resolve, reject) => {
  const deviceId = randomBytes(8).toString("hex");
  const apiKey = buildApiKey(deviceId);
  const target = new URL(API_ENDPOINT);
  target.searchParams.set("tab_id", String(tabId));
  target.searchParams.set("tab_access_type", "public");
  const req = httpsRequest(
    target,
    {
      method: "GET",
      headers: {
        "Accept-Charset": "utf-8",
        Accept: "application/json",
        "User-Agent": "UGT_ANDROID/4.11.1 (Pixel; 8.1.0)",
        Connection: "close",
        "X-UG-CLIENT-ID": deviceId,
        "X-UG-API-KEY": apiKey
      }
    },
    (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`Ultimate Guitar request failed (${res.statusCode ?? "no status"}): ${body}`));
          return;
        }
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Unable to parse Ultimate Guitar response: ${error.message}`));
        }
      });
    }
  );
  req.on("error", reject);
  req.end();
});
var normalizeContent = (content) => content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\[tab\]/gi, "").replace(/\[\/tab\]/gi, "").replace(/\[ch\]([^[]+?)\[\/ch\]/gi, "[$1]").replace(/\n{3,}/g, "\n\n").trimEnd();
var resolveDefaultKey = (tab) => {
  const keyCandidates = [tab.tonality_name, tab.recording?.tonality_name].filter(Boolean);
  return keyCandidates.find((value) => value && value.trim()) ?? "C";
};
var extractTabId = (source) => {
  const trimmed = source.trim();
  if (!trimmed) {
    throw new Error("Provide a URL or tab id.");
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
  }
  const fallbackMatch = trimmed.match(/(\d{5,})/);
  if (fallbackMatch) {
    return Number.parseInt(fallbackMatch[1], 10);
  }
  throw new Error("Unable to find a tab id in the provided value.");
};
var fetchUltimateGuitarSong = async (source) => {
  const tabId = extractTabId(source);
  const tab = await performRequest(tabId);
  if (!tab || !tab.song_name || !tab.artist_name || !tab.content) {
    throw new Error("Received an incomplete response from Ultimate Guitar.");
  }
  const normalized = normalizeContent(tab.content);
  const lines = parseContent(normalized);
  const suggestedId = buildSongId(tab.song_name, tab.artist_name);
  const song = {
    id: suggestedId,
    title: tab.song_name,
    artist: tab.artist_name,
    defaultKey: resolveDefaultKey(tab),
    capo: tab.capo && Number.isFinite(tab.capo) && tab.capo > 0 ? tab.capo : void 0,
    lines
  };
  return {
    tabId,
    source,
    suggestedId,
    song
  };
};

// server/index.ts
var app = express();
app.use(express.json());
app.post("/api/ultimate-guitar/import", async (req, res) => {
  try {
    const source = typeof req.body?.source === "string" ? req.body.source : "";
    const result = await fetchUltimateGuitarSong(source);
    res.json({ result });
  } catch (error) {
    res.status(400).json({ error: error.message || "Unable to import from Ultimate Guitar" });
  }
});
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var distDir = path.resolve(__dirname, "../dist");
app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});
var port = Number.parseInt(process.env.PORT ?? "4173", 10);
var host = process.env.HOST ?? "0.0.0.0";
app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});
