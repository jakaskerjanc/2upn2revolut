#!/usr/bin/env node
// Self-signed HTTPS cert for local dev so phones on the LAN get a secure
// context for getUserMedia. Regenerate (`pnpm certs`) if your LAN IP changes.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const certsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'certs');
const keyPath = path.join(certsDir, 'dev-key.pem');
const certPath = path.join(certsDir, 'dev-cert.pem');

if (existsSync(keyPath) && existsSync(certPath) && !process.argv.includes('--force')) {
  console.log('certs/ already has a cert. Pass --force to regenerate.');
  process.exit(0);
}

const lanIps = Object.values(networkInterfaces())
  .flat()
  .filter((i) => i && i.family === 'IPv4' && !i.internal)
  .map((i) => i.address);

const san = [
  'DNS:localhost',
  'IP:127.0.0.1',
  ...[...new Set(lanIps)].map((ip) => `IP:${ip}`),
].join(',');

mkdirSync(certsDir, { recursive: true });

execFileSync('openssl', [
  'req',
  '-x509',
  '-newkey',
  'rsa:2048',
  '-nodes',
  '-keyout',
  keyPath,
  '-out',
  certPath,
  '-days',
  '825',
  '-subj',
  '/CN=localhost',
  '-addext',
  `subjectAltName=${san}`,
]);

console.log(`Generated ${certPath} (SAN: ${san})`);
