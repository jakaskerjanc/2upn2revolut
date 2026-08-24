/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REVOLUT_DEEPLINK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
