import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './dist/server/index.js';
const request = (path, body) => new Request('https://test.invalid' + path, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) });
test('health never returns secrets', async () => {
  const data = await (await worker.fetch(request('/api/health'), { ORS_API_KEY: 'test-secret' })).json();
  assert.equal(data.configured, true); assert.ok(!JSON.stringify(data).includes('test-secret'));
});
test('MCP discovery and advertised route safety', async () => {
  const discover = await (await worker.fetch(request('/mcp', { jsonrpc: '2.0', id: 1, method: 'server/discover' }), {})).json();
  assert.ok(discover.result.supportedVersions.includes('2026-07-28'));
  const listed = await (await worker.fetch(request('/mcp', { jsonrpc: '2.0', id: 2, method: 'tools/list' }), {})).json();
  assert.equal(listed.result.tools.length, 2);
  assert.equal(listed.result.tools[1].inputSchema.properties.allowHighway.default, false);
});
test('missing key is a tool error and cannot fabricate routes', async () => {
  const reply = await (await worker.fetch(request('/mcp', { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'find_tokyo_taxi_routes', arguments: { origin: '東京駅', destination: '羽田空港' } } }), {})).json();
  assert.equal(reply.result.isError, true);
  assert.match(reply.result.content[0].text, /ORS_API_KEY/);
});
test('route retry preserves highway restrictions; chat omits geometry', async () => {
  const previous = globalThis.fetch; const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('/geocode/')) return Response.json({ features: [{ geometry: { coordinates: [139.77, 35.68] }, properties: { label: '東京駅' } }] });
    if (JSON.parse(options.body).alternative_routes) return new Response('{}', { status: 400 });
    return Response.json({ features: [{ geometry: { type: 'LineString', coordinates: [[139.77,35.68],[139.78,35.69]] }, properties: { summary: { distance: 1234, duration: 300 } } }] });
  };
  try {
    const reply = await (await worker.fetch(request('/mcp', { jsonrpc:'2.0', id:4, method:'tools/call', params:{ name:'find_tokyo_taxi_routes', arguments:{origin:'東京駅',destination:'銀座駅'} } }), { ORS_API_KEY:'fake-key' })).json();
    assert.ok(!reply.result.isError);
    const data = JSON.parse(reply.result.content[0].text);
    assert.equal(data.liveTraffic, false); assert.equal(data.routes[0].meters, 1234); assert.equal(data.routes[0].geometry, undefined);
    const routeCalls = calls.filter(c => c.options.body);
    assert.equal(routeCalls.length, 2);
    for (const call of routeCalls) assert.deepEqual(JSON.parse(call.options.body).options.avoid_features, ['highways','tollways']);
    assert.ok(calls.every(c => !c.url.includes('fake-key')));
  } finally { globalThis.fetch = previous; }
});
test('source and hidden files are not served', async () => {
  for (const path of ['/server.py','/.env','/.openai/hosting.json']) assert.equal((await worker.fetch(request(path), {})).status, 404);
  assert.equal((await worker.fetch(request('/'), {})).status, 200);
});
test('automatic speech clearly reports missing configuration', async () => {
  const response = await worker.fetch(new Request('https://test.invalid/api/transcribe', { method: 'POST', body: new FormData() }), {});
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /未設定/);
});
test('automatic speech omits language, preserves original transcript and hides credentials', async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(options.body.get('language'), null);
    assert.equal(options.body.get('model'), 'gpt-4o-mini-transcribe');
    assert.equal(options.headers.Authorization, 'Bearer fake-speech-key');
    return Response.json({ text: 'Please take me to Tokyo Station.' });
  };
  try {
    const form = new FormData(); form.append('file', new Blob(['test audio'], { type: 'audio/mp4' }), 'voice.mp4');
    const response = await worker.fetch(new Request('https://test.invalid/api/transcribe', { method: 'POST', body: form }), { OPENAI_API_KEY: 'fake-speech-key' });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { text: 'Please take me to Tokyo Station.' });
  } finally { globalThis.fetch = previous; }
});
test('automatic speech rejects unsupported files before contacting provider', async () => {
  const form = new FormData(); form.append('file', new Blob(['not audio'], { type: 'text/plain' }), 'data.txt');
  const response = await worker.fetch(new Request('https://test.invalid/api/transcribe', { method: 'POST', body: form }), { OPENAI_API_KEY: 'fake-key' });
  assert.equal(response.status, 400);
});
