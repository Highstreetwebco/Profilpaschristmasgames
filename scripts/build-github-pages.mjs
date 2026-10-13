import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {PAGES_PATH} from '../lib/deployment.js';

const root=fileURLToPath(new URL('../',import.meta.url));
// GitHub already publishes main at the repository root. Build the real React
// client there; public/assets stays in its existing tracked location.
await build({configFile:false,root:resolve(root,'web-client'),base:`${PAGES_PATH}github-pages/`,publicDir:false,
 plugins:[{name:'github-pages-artwork-paths',enforce:'pre',transform(code,id){if(/\.(?:tsx?|jsx?|css)(?:\?|$)/.test(id)&&!id.includes('node_modules'))return code.replaceAll('/assets/',`${PAGES_PATH}public/assets/`);}},react()],
 build:{outDir:resolve(root,'github-pages'),emptyOutDir:true,sourcemap:false,target:'es2022',rollupOptions:{output:{entryFileNames:'game-[hash].js',chunkFileNames:'chunk-[hash].js',assetFileNames:'game-[hash][extname]'}}}
});
const html=await readFile(resolve(root,'github-pages/index.html'),'utf8');
if(/http-equiv=["']refresh|location\.(?:replace|assign)|<iframe/i.test(html))throw new Error('GitHub Pages must run the game directly.');
await writeFile(resolve(root,'index.html'),html);
console.log('GitHub Pages entry and game bundle built. The browser stays on the GitHub URL.');
