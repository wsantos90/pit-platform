#!/usr/bin/env node
// @ts-check
/**
 * Gera os arquivos da extensao PIT Cookie Sync para o Microsoft Edge.
 * A extensao le cookies EA do browser e envia para o cookie service automaticamente.
 *
 * Uso:
 *   node scripts/create-edge-extension.js
 *
 * Depois:
 *   1. Abra edge://extensions
 *   2. Ative "Modo de desenvolvedor" (canto superior direito)
 *   3. Clique "Carregar sem compactacao"
 *   4. Selecione a pasta: scripts/edge-extension/
 *   5. Pronto — a extensao roda em segundo plano e renova os cookies a cada 20 min
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Carregar .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const COOKIE_SERVICE_URL = (process.env.COOKIE_SERVICE_URL ?? '').replace(/\/$/, '');
const COOKIE_SERVICE_SECRET = process.env.COOKIE_SERVICE_SECRET ?? '';
const INTERVAL_MINUTES = 19; // ligeiramente abaixo do TTL de 20 min

if (!COOKIE_SERVICE_URL || !COOKIE_SERVICE_SECRET) {
  console.error('❌ COOKIE_SERVICE_URL ou COOKIE_SERVICE_SECRET nao definidos no .env.local');
  process.exit(1);
}

const extensionDir = path.join(__dirname, 'edge-extension');
fs.mkdirSync(extensionDir, { recursive: true });

// ─── manifest.json ───────────────────────────────────────────────────────────
const manifest = {
  manifest_version: 3,
  name: 'PIT Cookie Sync',
  version: '1.0.0',
  description: 'Sincroniza cookies EA/Akamai com o PIT Cookie Service automaticamente.',
  permissions: ['cookies', 'alarms'],
  host_permissions: [
    'https://*.ea.com/*',
    COOKIE_SERVICE_URL + '/*',
  ],
  background: {
    service_worker: 'background.js',
  },
  icons: {
    '48': 'icon.png',
  },
  action: {
    default_title: 'PIT Cookie Sync',
  },
};

fs.writeFileSync(
  path.join(extensionDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// ─── background.js ───────────────────────────────────────────────────────────
const backgroundJs = `// PIT Cookie Sync — background service worker
// Gerado por create-edge-extension.js

const COOKIE_SERVICE_URL = ${JSON.stringify(COOKIE_SERVICE_URL)};
const COOKIE_SERVICE_SECRET = ${JSON.stringify(COOKIE_SERVICE_SECRET)};
const EA_DOMAIN = 'proclubs.ea.com';
const ALARM_NAME = 'pit-cookie-sync';
const INTERVAL_MINUTES = ${INTERVAL_MINUTES};

async function syncCookies() {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log('[PIT] ' + now + ' — Sincronizando cookies EA...');

  // chrome.cookies pode ler cookies HttpOnly — privilegio exclusivo de extensoes
  const [ak_bmsc, bm_sv] = await Promise.all([
    chrome.cookies.get({ url: 'https://' + EA_DOMAIN, name: 'ak_bmsc' }),
    chrome.cookies.get({ url: 'https://' + EA_DOMAIN, name: 'bm_sv' }),
  ]);

  if (!ak_bmsc?.value) {
    console.warn('[PIT] ak_bmsc nao encontrado. Visite https://' + EA_DOMAIN + ' no Edge.');
    return;
  }
  if (!bm_sv?.value) {
    console.warn('[PIT] bm_sv nao encontrado. Acesse a API do EA no Edge para gerar o cookie.');
    return;
  }

  try {
    const response = await fetch(COOKIE_SERVICE_URL + '/api/cookies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret': COOKIE_SERVICE_SECRET,
      },
      body: JSON.stringify({ ak_bmsc: ak_bmsc.value, bm_sv: bm_sv.value }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[PIT] ✅ Cookie service atualizado:', JSON.stringify(result));
    } else {
      const body = await response.text();
      console.error('[PIT] ❌ Cookie service erro ' + response.status + ':', body);
    }
  } catch (err) {
    console.error('[PIT] ❌ Falha na requisicao:', err.message);
  }
}

// Sincronizar ao iniciar o Edge
syncCookies();

// Agendar sincronizacao periodica
chrome.alarms.create(ALARM_NAME, { periodInMinutes: INTERVAL_MINUTES });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) syncCookies();
});

// Log de inicializacao
console.log('[PIT] Cookie Sync iniciado. Intervalo: ' + INTERVAL_MINUTES + ' min');
`;

fs.writeFileSync(path.join(extensionDir, 'background.js'), backgroundJs);

// ─── icon.png (placeholder 1x1 pixel PNG) ────────────────────────────────────
// PNG minimo valido (1x1 pixel verde)
const iconPng = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000300000003008020000009d36' +
  '61000000094944415478016360f8cf0000000200012221bc330000000049454e44ae426082',
  'hex'
);
fs.writeFileSync(path.join(extensionDir, 'icon.png'), iconPng);

// ─── Output ──────────────────────────────────────────────────────────────────
const absPath = path.resolve(extensionDir);

console.log('\n✅ Extensao criada em:', absPath);
console.log('   Cookie service:', COOKIE_SERVICE_URL);
console.log('   Intervalo:', INTERVAL_MINUTES, 'min');
console.log('\n📋 Proximos passos:');
console.log('   1. Abra o Edge e acesse: edge://extensions');
console.log('   2. Ative o "Modo de desenvolvedor" (toggle no canto superior direito)');
console.log('   3. Clique em "Carregar sem compactacao"');
console.log('   4. Selecione esta pasta:');
console.log('      ' + absPath);
console.log('   5. A extensao aparecera como "PIT Cookie Sync"');
console.log('   6. Acesse https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=637741&maxResultCount=20&matchType=friendlyMatch');
console.log('      no Edge para gerar o bm_sv, depois a extensao sincroniza automaticamente.');
console.log('\n💡 Para ver os logs da extensao:');
console.log('   edge://extensions → PIT Cookie Sync → "service worker" → Console');
