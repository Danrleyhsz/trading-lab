import {assertAiAppendOnly} from '../domain/ai-analysis.js';
import{mkdir,readFile,rename,writeFile}from "node:fs/promises";import{dirname}from "node:path";import type{StateStore,StoredState}from "../domain/storage.js";
export class JsonStateStore implements StateStore {
 private pending: Promise<void> = Promise.resolve();
 constructor(private path=process.env.STATE_FILE||"data/state.json"){}
 async load(){try{return JSON.parse(await readFile(this.path,"utf8")) as StoredState}catch(e:any){if(e?.code==="ENOENT")return null;throw e}}
 save(state: StoredState) {
  state = structuredClone(state);
  const contents = JSON.stringify(state, null, 2);
  const write = async () => {
   assertAiAppendOnly((await this.load())?.aiLedger, state.aiLedger);
   await mkdir(dirname(this.path), {recursive: true});
   const tmp = this.path + '.tmp';
   await writeFile(tmp, contents, 'utf8');
   await rename(tmp, this.path);
  };
  const result = this.pending.then(write);
  this.pending = result.catch(() => {});
  return result;
 }
}
