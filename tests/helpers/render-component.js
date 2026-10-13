import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {runInThisContext} from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url),cache=new Map();
export function component(path){path=resolve(path);if(cache.has(path))return cache.get(path).exports;const module={exports:{}};cache.set(path,module);const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;const local=name=>{if(!name.startsWith('.'))return require(name);let child=resolve(dirname(path),name);if(!existsSync(child))child=['.tsx','.ts','.js'].map(ext=>child+ext).find(existsSync);return component(child);};runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:path})(local,module,module.exports);return module.exports;}
