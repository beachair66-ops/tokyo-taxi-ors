import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('./i18n.js',import.meta.url),'utf8');
test('dynamic route summaries and service errors translate without changing addresses',()=>{
  const context=vm.createContext({});vm.runInContext(code,context);const t=context.TaxiI18n.translate;
  assert.equal(t('ルート A　11.0 km・約35分','zh-CN'),'路线 A　11.0 km · 约35分钟');
  assert.equal(t('認識した目的地：東京駅。内容を確認して検索してください。','zh-CN'),'识别的目的地：東京駅。请确认后查询。');
  assert.equal(t('検索できませんでした：ルート検索サービスは未設定です。管理者がORS_API_KEYを設定すると利用できます。','zh-CN'),'查询失败：路线服务尚未配置，设置服务端ORS_API_KEY后即可使用。');
  assert.equal(t('ルート A　11.0 km・約35分','ja'),'ルート A　11.0 km・約35分');
});
test('UI switching is reversible, persists preference and handles newly inserted text',()=>{
  let changed,mutated;const storage=new Map();
  const parent={closest:()=>false};const title={nodeType:3,nodeValue:'東京タクシールート',parentElement:parent};
  const element={nodeType:1,closest:()=>false,hasAttribute:()=>false};
  const select={value:'ja',addEventListener:(name,fn)=>{changed=fn}};
  const nodes=[title];
  const document={body:element,documentElement:{lang:'ja'},title:'',getElementById:()=>select,createTreeWalker:()=>{let i=-1;return {nextNode(){this.currentNode=nodes[++i];return Boolean(this.currentNode)}}}};
  const context=vm.createContext({document,NodeFilter:{SHOW_ELEMENT:1,SHOW_TEXT:4},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},MutationObserver:class{constructor(fn){mutated=fn}observe(){}}});
  vm.runInContext(code,context);
  select.value='zh-CN';changed();assert.equal(title.nodeValue,'东京出租车路线');assert.equal(document.documentElement.lang,'zh-CN');assert.equal(storage.get('taxi-ui-language'),'zh-CN');
  const result={nodeType:3,nodeValue:'✓ 選択中',parentElement:parent};nodes.push(result);mutated([{type:'childList',addedNodes:[result]}]);assert.equal(result.nodeValue,'✓ 已选择');
  select.value='ja';changed();assert.equal(title.nodeValue,'東京タクシールート');assert.equal(result.nodeValue,'✓ 選択中');
  // A saved preference must also apply to a fresh page load.
  storage.set('taxi-ui-language','zh-CN');vm.runInContext(code,context);assert.equal(select.value,'zh-CN');assert.equal(title.nodeValue,'东京出租车路线');
});
