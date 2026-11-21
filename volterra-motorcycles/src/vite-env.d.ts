/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEST_RIDE_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
