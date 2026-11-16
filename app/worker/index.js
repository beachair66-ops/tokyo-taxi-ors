const VERSION = '2026-07-28';
const routeSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    origin: { type: 'string', minLength: 2, maxLength: 180, description: '日本国内の出発地。正式な日本語住所を推奨。' },
    destination: { type: 'string', minLength: 2, maxLength: 180, description: '日本国内の目的地。正式な日本語住所を推奨。' },
    allowHighway: { type: 'boolean', default: false, description: '利用者が高速道路・有料道路を明示的に許可した場合だけtrueにする。' }
  }, required: ['origin', 'destination']
};
const tools = [
  { name: 'check_route_service', description: '東京タクシールートのORS・音声認識サービス設定状況を確認する。APIキーは返さない。', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true } },
  { name: 'find_tokyo_taxi_routes', description: '日本の実際の道路ルートを検索する。初期設定は高速道路・有料道路を避ける。渋滞情報・タクシー運賃は含まない。住所はopenrouteserviceへ送信する。交通標識を優先する。', inputSchema: routeSchema, annotations: { readOnlyHint: true } }
];
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }); }
function health(env) { return { configured: Boolean(env.ORS_API_KEY?.trim()), speechConfigured: Boolean(env.OPENAI_API_KEY?.trim()), liveTraffic: false, provider: 'openrouteservice' }; }
class ServiceError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
async function upstream(path, key, body) {
  const response = await fetch('https://api.openrouteservice.org' + path, {
    method: body ? 'POST' : 'GET', headers: { Authorization: key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new ServiceError(`ORSに接続できません（${response.status}）。サービス設定・利用枠・入力住所を確認してください。`, response.status);
  return response.json();
}
function coordinate(item) {
  return Array.isArray(item) && item.length === 2 && item.every(x => typeof x === 'number' && Number.isFinite(x)) && item[0] > 120 && item[0] < 155 && item[1] > 20 && item[1] < 47;
}
async function resolve(item, key) {
  if (coordinate(item)) return { name: '現在地', coordinates: item };
  if (typeof item !== 'string' || item.trim().length < 2 || item.length > 180) throw new ServiceError('日本国内の有効な住所または座標を入力してください。');
  const query = new URLSearchParams({ text: item.trim(), 'boundary.country': 'JPN', size: '1' });
  const data = await upstream('/geocode/search?' + query, key);
  const first = data.features?.[0];
  if (!first || !coordinate(first.geometry?.coordinates)) throw new ServiceError('日本国内の住所が見つかりません。正式な日本語住所でお試しください。');
  return { name: first.properties?.label || item, coordinates: first.geometry.coordinates };
}
async function findRoutes(args, env) {
  const key = env.ORS_API_KEY?.trim();
  if (!key) throw new ServiceError('ルート検索サービスは未設定です。管理者がORS_API_KEYを設定すると利用できます。', 503);
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new ServiceError('リクエストの形式が正しくありません。');
  if (args.allowHighway !== undefined && typeof args.allowHighway !== 'boolean') throw new ServiceError('allowHighwayにはtrueまたはfalseを指定してください。');
  const allow = args.allowHighway === true;
  const origin = await resolve(args.origin, key);
  const destination = await resolve(args.destination, key);
  const payload = { coordinates: [origin.coordinates, destination.coordinates], alternative_routes: { target_count: 3, share_factor: .6, weight_factor: 1.8 }, instructions: false };
  if (!allow) payload.options = { avoid_features: ['highways', 'tollways'] };
  let result;
  try { result = await upstream('/v2/directions/driving-car/geojson', key, payload); }
  catch (e) {
    if (![400, 404].includes(e.status)) throw e;
    delete payload.alternative_routes;
    result = await upstream('/v2/directions/driving-car/geojson', key, payload);
  }
  const routes = (result.features || []).map((feature, id) => ({ id, meters: feature.properties?.summary?.distance, seconds: feature.properties?.summary?.duration, geometry: feature.geometry }));
  if (!routes.length) throw new ServiceError('走行可能なルートが見つかりませんでした。');
  const nav = new URL('https://www.google.com/maps/dir/');
  nav.search = new URLSearchParams({ api: '1', origin: origin.coordinates.slice().reverse().join(','), destination: destination.coordinates.slice().reverse().join(','), travelmode: 'driving', ...(!allow ? { avoid: 'highways,tolls' } : {}) });
  return { source: 'openrouteservice', origin, destination, allowHighway: allow, liveTraffic: false, routes, navigationUrl: nav.toString(), notice: '所要時間は渋滞情報を含みません。外部ナビでは再計算されるため、高速道路を避ける設定を確認してください。' };
}
async function rpc(message, env) {
  const id = message?.id ?? null;
  const ok = result => json({ jsonrpc: '2.0', id, result });
  const error = (code, text) => json({ jsonrpc: '2.0', id, error: { code, message: text } });
  if (message?.jsonrpc !== '2.0' || typeof message.method !== 'string') return error(-32600, 'Invalid Request');
  if (message.method.startsWith('notifications/')) return new Response(null, { status: 202 });
  if (message.method === 'server/discover') return ok({ supportedVersions: [VERSION], capabilities: { tools: {} } });
  if (message.method === 'initialize') return ok({ protocolVersion: message.params?.protocolVersion || VERSION, capabilities: { tools: {} }, serverInfo: { name: 'tokyo-taxi-ors', version: '2.1.0' } });
  if (message.method === 'ping') return ok({});
  if (message.method === 'tools/list') return ok({ tools });
  if (message.method !== 'tools/call') return error(-32601, 'Method not found');
  const name = message.params?.name;
  if (!tools.some(t => t.name === name)) return error(-32602, 'Unknown tool');
  try {
    const result = name === 'check_route_service' ? health(env) : await findRoutes(message.params?.arguments, env);
    // Keep geometry out of chat responses; the webpage retains full geometry.
    if (result.routes) result.routes = result.routes.map(({ geometry, ...summary }) => summary);
    return ok({ content: [{ type: 'text', text: JSON.stringify(result) }] });
  } catch (e) { return ok({ isError: true, content: [{ type: 'text', text: e instanceof ServiceError ? e.message : 'ルート検索を利用できません。しばらくしてからお試しください。' }] }); }
}
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/transcribe' && request.method === 'POST') {
      if (!env.OPENAI_API_KEY?.trim()) return json({ error: '自動言語判定は未設定です。日本語・英語・中国語を選んで音声入力してください。' }, 503);
      if (!request.headers.get('Content-Type')?.startsWith('multipart/form-data')) return json({ error: '音声ファイルを送信してください。' }, 400);
      const maxBytes = 3 * 1024 * 1024;
      const reader = request.body?.getReader();
      if (!reader) return json({ error: '音声がありません。' }, 400);
      const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > maxBytes) { await reader.cancel(); return json({ error: '録音が長すぎます。20秒以内でお話しください。' }, 413); }
        chunks.push(value);
      }
      try {
        const input = await new Response(new Blob(chunks), { headers: { 'Content-Type': request.headers.get('Content-Type') } }).formData();
        const file = input.get('file');
        if (!file || typeof file.arrayBuffer !== 'function' || !file.size || !['audio/webm','audio/mp4','audio/ogg','audio/mpeg','audio/wav'].includes(file.type.split(';')[0])) return json({ error: '対応する音声ファイルを送信してください。' }, 400);
        const form = new FormData();
        form.append('file', file, file.name); form.append('model', 'gpt-4o-mini-transcribe');
        // Omit language: the transcription service detects the spoken language.
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY.trim() }, body: form, signal: AbortSignal.timeout(25000) });
        if (!response.ok) return json({ error: '音声認識サービスを利用できません。設定や利用枠を確認してください。' }, 502);
        const data = await response.json();
        if (typeof data.text !== 'string' || !data.text.trim()) return json({ error: '音声を認識できませんでした。もう一度お話しください。' }, 422);
        return json({ text: data.text.trim() });
      } catch { return json({ error: '音声認識に失敗しました。もう一度お試しください。' }, 502); }
    }
    if (path === '/api/health' && request.method === 'GET') return json(health(env));
    if ((path === '/api/routes' || path === '/mcp') && request.method === 'POST') {
      const body = await request.text();
      if (new TextEncoder().encode(body).length > 16000) return json({ error: 'リクエストが大きすぎます。' }, 413);
      let data; try { data = JSON.parse(body); } catch { return json({ error: 'JSONの形式が正しくありません。' }, 400); }
      if (path === '/mcp') return rpc(data, env);
      try { return json(await findRoutes(data, env)); }
      catch (e) { return json({ error: e instanceof ServiceError ? e.message : 'ルート検索を利用できません。' }, e instanceof ServiceError && [400, 503].includes(e.status) ? e.status : 502); }
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') return json({ error: 'Method not allowed' }, 405);
    const file = path === '/' ? 'index.html' : path.slice(1);
    if (!Object.hasOwn(ASSETS, file)) return json({ error: 'Not found' }, 404);
    return new Response(request.method === 'HEAD' ? null : ASSETS[file], { headers: { 'Content-Type': ({ 'index.html': 'text/html; charset=utf-8', 'app.js': 'text/javascript; charset=utf-8', 'manifest.webmanifest': 'application/manifest+json' })[file], 'X-Content-Type-Options': 'nosniff' } });
  }
};
