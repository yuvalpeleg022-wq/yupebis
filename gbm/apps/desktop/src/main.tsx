import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { GameApp, webPlatform } from '@gbm/ui-components';
import '@gbm/ui-components/styles.css';
import { isTauri, tauriPlatform } from './tauri-platform';

const platform = isTauri() ? tauriPlatform(sqlWasmUrl) : webPlatform(sqlWasmUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameApp platform={platform} />
  </StrictMode>,
);
