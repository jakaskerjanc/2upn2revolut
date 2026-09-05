/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const keyPath = fileURLToPath(new URL('./certs/dev-key.pem', import.meta.url));
const certPath = fileURLToPath(new URL('./certs/dev-cert.pem', import.meta.url));
const devHttps =
  existsSync(keyPath) && existsSync(certPath)
    ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
    : undefined;

export default defineConfig({
  base: '/2upn2revolut/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, https: devHttps },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
