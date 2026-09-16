#!/usr/bin/env node
/**
 * Activa o desactiva funcionalidades (feature flags) de src/config/features.js.
 *
 * Uso:
 *   node scripts/feature.js                 # muestra el estado actual
 *   node scripts/feature.js crm on          # activar CRM
 *   node scripts/feature.js crm off         # ocultar CRM
 *
 * Tras cambiarlo, haz commit y deploy (o reinicia el dev server).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'src', 'config', 'features.js');

const src = readFileSync(FILE, 'utf8');

// Parsear los flags actuales (name: true/false)
const flags = {};
const re = /(\w+)\s*:\s*(true|false)/g;
let m;
while ((m = re.exec(src)) !== null) flags[m[1]] = m[2] === 'true';

const [, , name, value] = process.argv;

if (!name) {
    console.log('Funcionalidades actuales:');
    Object.entries(flags).forEach(([k, v]) => console.log(`  ${k}: ${v ? 'ACTIVADA ✅' : 'oculta ❌'}`));
    console.log('\nUso: node scripts/feature.js <nombre> <on|off>');
    process.exit(0);
}

if (!(name in flags)) {
    console.error(`❌ La funcionalidad "${name}" no existe. Disponibles: ${Object.keys(flags).join(', ')}`);
    process.exit(1);
}

const on = ['on', 'true', '1', 'si', 'sí'].includes((value || '').toLowerCase());
const off = ['off', 'false', '0', 'no'].includes((value || '').toLowerCase());
if (!on && !off) {
    console.error('❌ Indica "on" u "off". Ej: node scripts/feature.js crm on');
    process.exit(1);
}

const next = on;
const updated = src.replace(
    new RegExp(`(${name}\\s*:\\s*)(true|false)`),
    `$1${next}`
);
writeFileSync(FILE, updated);
console.log(`✅ "${name}" ahora está ${next ? 'ACTIVADA' : 'oculta'}. Haz commit y deploy para aplicarlo.`);
