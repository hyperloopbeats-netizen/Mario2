import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(express.json({ limit: '15mb' }));

const HTML_MODULES = new Set([
  'AIM OS Brain',
  'AIM OS V8.4',
  'AIM OSx Sentient Game Generaror',
  'AutoCAD',
  'Face2',
  'PS6 Sun',
  'Sun2',
  'The Sun'
]);

const JSON_MODULES = new Set([
  'AIM Cometic OS V30'
]);

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

function formatGeminiError(err, fallback) {
  let status = Number(err?.status) || 500;
  let message = String(err?.message || fallback || 'AI request failed.');
  if (message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed?.error?.code) status = Number(parsed.error.code) || status;
      if (parsed?.error?.message) {
        message = String(parsed.error.message).split('\n')[0];
      }
    } catch {
      // keep original message
    }
  }
  // Strip verbose multi-line docs URLs so mobile status strips stay clean and readable
  message = message.replace(/For more information on this error[\s\S]*/i, '').trim();
  if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit/i.test(message)) {
    status = 429;
    message = 'Gemini rate limit reached (429). Wait a moment or select a billing-enabled key in Settings > Secrets.';
  } else if (status === 401 || status === 403 || /API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    message = 'Invalid or unauthorized GEMINI_API_KEY. Check Settings > Secrets.';
  } else if (message.length > 160) {
    message = message.slice(0, 157) + '...';
  }
  return { status, message };
}

function sanitizeJsonText(rawText) {
  let txt = String(rawText || '').trim();
  if (txt.startsWith('```')) {
    txt = txt.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }
  const firstBrace = txt.indexOf('{');
  const firstBracket = txt.indexOf('[');
  let start = -1;
  if (firstBrace >= 0 && firstBracket >= 0) start = Math.min(firstBrace, firstBracket);
  else start = Math.max(firstBrace, firstBracket);
  if (start > 0) txt = txt.slice(start);
  const lastBrace = txt.lastIndexOf('}');
  const lastBracket = txt.lastIndexOf(']');
  const end = Math.max(lastBrace, lastBracket);
  if (end >= 0 && end < txt.length - 1) txt = txt.slice(0, end + 1);
  return txt || '{}';
}

function parseModelJson(rawText) {
  return JSON.parse(sanitizeJsonText(rawText));
}

async function generateWithRetry(ai, params) {
  const modelsToTry = [params.model || 'gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastErr = null;

  for (let mIdx = 0; mIdx < modelsToTry.length; mIdx++) {
    const model = modelsToTry[mIdx];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await ai.models.generateContent({ ...params, model });
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || '');
        const status = Number(err?.status) || 0;
        const isTransient = status === 429 || status === 503 || /429|503|RESOURCE_EXHAUSTED|overloaded/i.test(msg);
        if (!isTransient) throw err;
        if (attempt === 0) {
          await new Promise((r) => setTimeout(r, 650));
        }
      }
    }
  }
  throw lastErr;
}

const CAD_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    summary: { type: Type.STRING },
    parts: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          shape: {
            type: Type.STRING,
            description: 'One of: box, cylinder, sphere, torus, torusKnot, cone, capsule, oct'
          },
          position: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          rotation: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          scale: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          color: { type: Type.STRING },
          emissive: { type: Type.STRING },
          emissiveIntensity: { type: Type.NUMBER },
          metalness: { type: Type.NUMBER },
          roughness: { type: Type.NUMBER },
          opacity: { type: Type.NUMBER },
          spinSpeed: { type: Type.NUMBER }
        },
        required: ['label', 'shape', 'position', 'rotation', 'scale', 'color', 'metalness', 'roughness']
      }
    }
  },
  required: ['name', 'summary', 'parts']
};

const MOVIE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    tagline: { type: Type.STRING },
    moodColor: { type: Type.STRING },
    fogDensity: { type: Type.NUMBER },
    cadAssembly: CAD_RESPONSE_SCHEMA,
    shots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          headline: { type: Type.STRING },
          subline: { type: Type.STRING },
          camera: { type: Type.STRING, description: 'One of: orbit, dolly, crane, hero, sweep' },
          keyColor: { type: Type.STRING },
          rimColor: { type: Type.STRING },
          cadSpinBoost: { type: Type.NUMBER },
          enableCad: { type: Type.BOOLEAN },
          enableSun: { type: Type.BOOLEAN },
          enableMario: { type: Type.BOOLEAN },
          enableGrid: { type: Type.BOOLEAN },
          enablePromo: { type: Type.BOOLEAN }
        },
        required: ['label', 'duration', 'headline', 'subline', 'camera', 'keyColor', 'rimColor', 'enableCad', 'enableSun', 'enableMario', 'enableGrid', 'enablePromo']
      }
    }
  },
  required: ['title', 'tagline', 'moodColor', 'fogDensity', 'cadAssembly', 'shots']
};

const TEXT2MOVIE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    tagline: { type: Type.STRING },
    directorNotes: { type: Type.STRING },
    movement: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, description: 'One of: spline_orbit, parkour_patrol, figure_eight, cinema_glide, zero_g' },
        stiffness: { type: Type.NUMBER },
        damping: { type: Type.NUMBER },
        smoothness: { type: Type.NUMBER },
        pathRadius: { type: Type.NUMBER },
        gaitSpeed: { type: Type.NUMBER },
        easeCurve: { type: Type.STRING, description: 'One of: quintic, cubic, spring' }
      },
      required: ['mode', 'stiffness', 'damping', 'smoothness', 'pathRadius', 'gaitSpeed', 'easeCurve']
    },
    scene: {
      type: Type.OBJECT,
      properties: {
        biome: { type: Type.STRING, description: 'One of: obsidian_studio, solar_foundry, mushroom_twilight, orbital_void, arctic_glass' },
        bgColor: { type: Type.STRING },
        fogColor: { type: Type.STRING },
        fogDensity: { type: Type.NUMBER },
        keyColor: { type: Type.STRING },
        rimColor: { type: Type.STRING },
        gridColor: { type: Type.STRING },
        sunScale: { type: Type.NUMBER }
      },
      required: ['biome', 'bgColor', 'fogColor', 'fogDensity', 'keyColor', 'rimColor', 'gridColor', 'sunScale']
    },
    cadAssembly: CAD_RESPONSE_SCHEMA,
    shots: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          duration: { type: Type.NUMBER },
          headline: { type: Type.STRING },
          subline: { type: Type.STRING },
          camera: { type: Type.STRING, description: 'One of: orbit, dolly, crane, hero, sweep' },
          keyColor: { type: Type.STRING },
          rimColor: { type: Type.STRING },
          cadSpinBoost: { type: Type.NUMBER },
          enableCad: { type: Type.BOOLEAN },
          enableSun: { type: Type.BOOLEAN },
          enableMario: { type: Type.BOOLEAN },
          enableGrid: { type: Type.BOOLEAN },
          enablePromo: { type: Type.BOOLEAN }
        },
        required: ['label', 'duration', 'headline', 'subline', 'camera', 'keyColor', 'rimColor', 'enableCad', 'enableSun', 'enableMario', 'enableGrid', 'enablePromo']
      }
    }
  },
  required: ['title', 'tagline', 'directorNotes', 'movement', 'scene', 'cadAssembly', 'shots']
};

const TRIAD_WORLD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    theme: { type: Type.STRING, description: 'One of: overworld, underground, sky' },
    skyColor: { type: Type.STRING },
    fogColor: { type: Type.STRING },
    gravity: { type: Type.NUMBER },
    pitFrequency: { type: Type.NUMBER },
    platformDensity: { type: Type.NUMBER },
    enemyDensity: { type: Type.NUMBER },
    coinRichness: { type: Type.NUMBER },
    pipeCount: { type: Type.NUMBER }
  },
  required: ['name', 'theme', 'skyColor', 'fogColor', 'gravity', 'pitFrequency', 'platformDensity', 'enemyDensity', 'coinRichness', 'pipeCount']
};

const TRIAD_SHADER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    metalnessOffset: { type: Type.NUMBER },
    roughnessOffset: { type: Type.NUMBER },
    clearcoat: { type: Type.NUMBER },
    emissiveBoost: { type: Type.NUMBER },
    gridGlow: { type: Type.NUMBER },
    rimColor: { type: Type.STRING },
    gridColor: { type: Type.STRING },
    sunColorA: { type: Type.STRING },
    sunColorB: { type: Type.STRING },
    bgColor: { type: Type.STRING }
  },
  required: ['name', 'metalnessOffset', 'roughnessOffset', 'clearcoat', 'emissiveBoost', 'gridGlow', 'rimColor', 'gridColor', 'sunColorA', 'sunColorB', 'bgColor']
};

const TRIAD_SONIC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    tempo: { type: Type.NUMBER },
    waveform: { type: Type.STRING, description: 'One of: square, sawtooth, triangle' },
    fireColor: { type: Type.STRING },
    lead: { type: Type.ARRAY, items: { type: Type.STRING } },
    bass: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ['name', 'tempo', 'waveform', 'fireColor', 'lead', 'bass']
};

const SENTIENT_GAME_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    biome: { type: Type.STRING },
    primary: { type: Type.STRING },
    secondary: { type: Type.STRING },
    accent: { type: Type.STRING },
    visor: { type: Type.STRING },
    stencil: { type: Type.STRING },
    titanClass: {
      type: Type.STRING,
      description: 'One of: vanguard, ion, scorch, northstar, ronin, tone, legion'
    },
    gravity: { type: Type.NUMBER },
    wallSpeed: { type: Type.NUMBER },
    airAccel: { type: Type.NUMBER }
  },
  required: ['title', 'biome', 'primary', 'secondary', 'accent', 'visor', 'stencil', 'titanClass', 'gravity', 'wallSpeed', 'airAccel']
};

const THOUGHT_CLOUD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    biome: { type: Type.STRING, description: 'One of: obsidian_studio, solar_foundry, mushroom_twilight, orbital_void, arctic_glass' },
    marioTheme: { type: Type.STRING, description: 'One of: overworld, underground, sky' },
    skyColor: { type: Type.STRING },
    fogColor: { type: Type.STRING },
    keyColor: { type: Type.STRING },
    rimColor: { type: Type.STRING },
    accentColor: { type: Type.STRING },
    gravity: { type: Type.NUMBER },
    speedMult: { type: Type.NUMBER },
    fireRateMult: { type: Type.NUMBER },
    damageMult: { type: Type.NUMBER },
    timeScale: { type: Type.NUMBER },
    wallrunSpeed: { type: Type.NUMBER },
    infiniteJumps: { type: Type.BOOLEAN },
    titanInstant: { type: Type.BOOLEAN },
    levelStyle: { type: Type.STRING, description: 'One of: keep, fortress, gauntlet, spire' },
    tempo: { type: Type.NUMBER }
  },
  required: ['title', 'biome', 'marioTheme', 'skyColor', 'fogColor', 'keyColor', 'rimColor', 'accentColor', 'gravity', 'speedMult', 'fireRateMult', 'damageMult', 'timeScale', 'wallrunSpeed', 'infiniteJumps', 'titanInstant', 'levelStyle', 'tempo']
};

app.post('/api/gemini/cad', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Please provide a 3D system prompt.' });
  }

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Design a detailed, multi-part 3D CAD mechanical or architectural system for: "${prompt}". Compose 6 to 12 distinct interlocking parts centered around origin (y from 0 to 4), with realistic PBR metalness (0..1), roughness (0..1), hex colors, and subtle spinSpeed on moving rotors/rings.`,
      config: {
        systemInstruction: 'You are an industrial 3D CAD systems architect. Output crisp structured JSON matching the schema. Use valid hex color strings like #38bdf8 or #e2e8f0. Keep positions within [-3, 3] on X/Z and [0.2, 4.2] on Y.',
        responseMimeType: 'application/json',
        responseSchema: CAD_RESPONSE_SCHEMA
      }
    });
    const parsed = parseModelJson(response.text);
    return res.json({ assembly: parsed });
  } catch (err) {
    console.error('Gemini CAD error:', err);
    const formatted = formatGeminiError(err, 'Failed to synthesize 3D CAD system.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/movie', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  const promoName = String(req.body?.promoName || '').trim();
  const imageDataUrl = typeof req.body?.imageDataUrl === 'string' ? req.body.imageDataUrl : null;

  if (!prompt && !imageDataUrl && !promoName) {
    return res.status(400).json({ error: 'Please provide a movie prompt or upload a promo image/video.' });
  }

  try {
    const parts = [];
    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
      const match = imageDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2]
          }
        });
      }
    }

    parts.push({
      text: `Direct a 4-shot cinematic Full HD movie sequence combining 3D Liquid CAD assemblies, the Digital Sun fractal plasma core, the Super Mario 3D hero rig, kinetic terrain grid, and ${promoName ? `the uploaded promo asset "${promoName}"` : 'studio promo screens'}. User prompt: "${prompt || 'Create a sleek black-glass cinematic promo film from the uploaded visual'}". Each shot should be 3 to 5 seconds long with bold cinematic headlines, matching camera choreography (orbit, dolly, crane, hero, sweep), and cohesive lighting colors.`
    });

    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: { parts },
      config: {
        systemInstruction: 'You are a visionary cinematic director for a real-time 3D WebGL film engine. Return valid JSON matching the schema with 4 distinct sequenced shots and an intricate 6-10 part CAD centerpiece.',
        responseMimeType: 'application/json',
        responseSchema: MOVIE_RESPONSE_SCHEMA
      }
    });

    const parsed = parseModelJson(response.text);
    return res.json({ movie: parsed });
  } catch (err) {
    console.error('Gemini Movie error:', err);
    const formatted = formatGeminiError(err, 'Failed to evoke movie scene.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/text2movie', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  const targetDuration = Math.max(8, Math.min(24, Number(req.body?.duration) || 12));
  if (!prompt) {
    return res.status(400).json({ error: 'Please enter a text prompt to generate a movie.' });
  }

  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Generate a unified Text-to-Movie production package for a ${targetDuration}-second 1080p film from this prompt: "${prompt}". Combine: (1) a 4-shot cinema sequence summing to ~${targetDuration}s, (2) a Hybrid Movement config (spline mode, spring stiffness 60..180, damping 8..22, smoothness 0.5..0.95, pathRadius 2.0..5.5, gaitSpeed 0.6..1.8), (3) a Hybrid Scene Designer environment (biome, hex colors, fogDensity 0.012..0.032, sunScale 0.7..1.4), and (4) a 6-to-10 part PBR Liquid CAD assembly centerpiece.`,
      config: {
        systemInstruction: 'You are an integrated film director, movement choreographer, and 3D CAD architect. Return crisp structured JSON matching the schema. Use valid 6-digit hex colors.',
        responseMimeType: 'application/json',
        responseSchema: TEXT2MOVIE_RESPONSE_SCHEMA
      }
    });
    const parsed = parseModelJson(response.text);
    return res.json({ package: parsed });
  } catch (err) {
    console.error('Gemini Text2Movie error:', err);
    const formatted = formatGeminiError(err, 'Failed to generate movie package.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/triad-world', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Enter a world description first.' });
  }
  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Design parameters for a playable 2D/3D Mario platformer world inspired by: "${prompt}". Choose theme (overworld, underground, sky), 6-digit hex skyColor & fogColor, gravity (28..56), pitFrequency (0..0.45), platformDensity (0.1..0.9), enemyDensity (0.1..0.9), coinRichness (0.1..0.9), and pipeCount (2..8).`,
      config: {
        systemInstruction: 'You are a platformer level designer. Return concise JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: TRIAD_WORLD_SCHEMA
      }
    });
    return res.json({ world: parseModelJson(response.text) });
  } catch (err) {
    console.error('Gemini Triad World error:', err);
    const formatted = formatGeminiError(err, 'Failed to forge world.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/triad-shader', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Enter a shader or material aesthetic prompt.' });
  }
  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Synthesize a PBR material & shader lighting profile for: "${prompt}". metalnessOffset (-0.5..0.5), roughnessOffset (-0.4..0.5), clearcoat (0..1), emissiveBoost (0..1.5), gridGlow (0.3..1.6), and 6-digit hex colors (rimColor, gridColor, sunColorA, sunColorB, bgColor).`,
      config: {
        systemInstruction: 'You are a WebGL PBR shader artist. Return concise JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: TRIAD_SHADER_SCHEMA
      }
    });
    return res.json({ shader: parseModelJson(response.text) });
  } catch (err) {
    console.error('Gemini Triad Shader error:', err);
    const formatted = formatGeminiError(err, 'Failed to synthesize shader.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/triad-sonic', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Enter a soundtrack or FX mood prompt.' });
  }
  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Compose a 16-step retro chiptune synth pattern for: "${prompt}". Return tempo (95..210), waveform (square, sawtooth, triangle), hex fireColor for matching fireballs/particles, and 16-item lead & bass arrays using note names from C3..C6 (e.g. C4, E4, G4, A4, C5, D5, E5, G5) or "-" for rest.`,
      config: {
        systemInstruction: 'You are a chiptune audio designer. Always return exactly 16 items in lead and 16 items in bass.',
        responseMimeType: 'application/json',
        responseSchema: TRIAD_SONIC_SCHEMA
      }
    });
    return res.json({ sonic: parseModelJson(response.text) });
  } catch (err) {
    console.error('Gemini Triad Sonic error:', err);
    const formatted = formatGeminiError(err, 'Failed to synthesize audio score.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/sentient-game', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Enter a game design prompt first.' });
  }
  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Co-design a synchronized Titanfall 2 / FPS / Studio game blueprint for: "${prompt}". Choose titanClass (vanguard, ion, scorch, northstar, ronin, tone, legion), 6-digit hex colors (primary, secondary, accent, visor), crisp short military stencil (max 8 chars), gravity (24..40), wallSpeed (14..24), and airAccel (10..20).`,
      config: {
        systemInstruction: 'You are a 5-agent sentient game studio. Return valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: SENTIENT_GAME_SCHEMA
      }
    });
    return res.json({ blueprint: parseModelJson(response.text) });
  } catch (err) {
    console.error('Gemini Sentient Game error:', err);
    const formatted = formatGeminiError(err, 'Failed to synthesize sentient blueprint.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.post('/api/gemini/thought-cloud', async (req, res) => {
  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not configured in server environment.' });
  }
  const prompt = String(req.body?.prompt || '').trim();
  if (!prompt) {
    return res.status(400).json({ error: 'Enter a Thought Cloud prompt to alter active games.' });
  }
  const snapshot = req.body?.awareness ? JSON.stringify(req.body.awareness).slice(0, 600) : '{}';
  try {
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Transform all active playing games (Titanfall 2, Team Fortress 3D, Super Mario, Liquid CAD, Shaders & Synth) using this Thought Cloud directive: "${prompt}". Live OS snapshot: ${snapshot}. Return balanced live mutation parameters: 6-digit hex skyColor/fogColor/keyColor/rimColor/accentColor, gravity (8..52), speedMult (0.6..2.2), fireRateMult (0.5..2.6), damageMult (0.6..2.8), timeScale (0.45..1.6), wallrunSpeed (14..26), infiniteJumps, titanInstant, levelStyle (keep, fortress, gauntlet, spire), tempo (95..200).`,
      config: {
        systemInstruction: 'You are the Hyper-Awareness Matrix Thought Cloud Engine. Output clean JSON strictly matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: THOUGHT_CLOUD_SCHEMA
      }
    });
    return res.json({ mutation: parseModelJson(response.text) });
  } catch (err) {
    console.error('Gemini Thought Cloud error:', err);
    const formatted = formatGeminiError(err, 'Failed to weave Thought Cloud shift.');
    return res.status(formatted.status).json({ error: formatted.message });
  }
});

app.use('/vendor/three', express.static(path.join(__dirname, 'node_modules/three')));
app.use('/src', express.static(path.join(__dirname, 'src')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/modules', (_req, res) => {
  res.json({
    htmlModules: Array.from(HTML_MODULES),
    jsonModules: Array.from(JSON_MODULES)
  });
});

app.get('/:moduleName', (req, res, next) => {
  const name = req.params.moduleName;
  if (HTML_MODULES.has(name)) {
    const filePath = path.join(__dirname, name);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.sendFile(filePath);
    }
  }
  if (JSON_MODULES.has(name)) {
    const filePath = path.join(__dirname, name);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.sendFile(filePath);
    }
  }
  next();
});

app.use(express.static(__dirname, { index: 'index.html' }));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

app.use((err, req, res, _next) => {
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 400).json({ error: err.message || 'Invalid JSON request payload.' });
  }
  return res.status(500).send('Server Error');
});

app.use((_req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`matrix-game-engine listening on http://${HOST}:${PORT}`);
});
