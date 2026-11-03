import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import sqlWasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { GameApp, webPlatform } from '@gbm/ui-components';
import '@gbm/ui-components/styles.css';
import { capacitorPlatform } from './capacitor-platform';

const platform = Capacitor.isNativePlatform() ? capacitorPlatform(sqlWasmUrl) : webPlatform(sqlWasmUrl);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameApp platform={platform} />
  </StrictMode>,
);
