'use strict';
const $=id=>document.getElementById(id);
let map,lines=[],markers=[],routes=[],chosen=0,lastResult=null,originCoords=null,recognition=null,recorder=null,recordTimer=null,voiceBusy=false;
const status=text=>$('status').textContent=text;
const languages={'ja-JP':'日本語','en-US':'英語','zh-CN':'中国語','zh-TW':'中国語','auto':'自動判定'};
if(window.L){map=L.map('map').setView([35.72,139.85],11);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors',maxZoom:19}).addTo(map)}else status('地図を読み込めませんでした。インターネット接続を確認してください。');
function clear(){lines.forEach(x=>map?.removeLayer(x));markers.forEach(x=>map?.removeLayer(x));lines=[];markers=[];routes=[];lastResult=null;$('routes').textContent='条件が変更されました。もう一度検索してください。'}
$('mode').onchange=()=>{clear();$('badge').textContent=$('mode').value==='live'?'実際の道路ルート・渋滞情報なし':'デモモード・サンプルデータ';status('検索モードを変更しました。もう一度検索してください。')};
$('highway').onchange=()=>{clear();status($('highway').checked?'高速道路・有料道路を利用します。事前にお客様へ確認してください。':'高速道路・有料道路を避ける条件で検索します。')};
$('origin').oninput=()=>{originCoords=null;clear()};$('destination').oninput=clear;
$('destination').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing&&!$('search').disabled)$('search').click()};
$('locate').onclick=()=>{if(!navigator.geolocation)return status('この端末は位置情報に対応していません。');status('現在地を取得しています。位置情報の利用を許可してください。');navigator.geolocation.getCurrentPosition(p=>{originCoords=[p.coords.longitude,p.coords.latitude];$('origin').value=`${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`;clear();status('現在地を取得しました。実際の検索時に位置情報をORSへ送信します。')},()=>status('現在地を取得できませんでした。位置情報の許可を確認するか、住所を入力してください。'),{enableHighAccuracy:true,timeout:12000})};
function voiceState(active){$('mic').classList.toggle('is-listening',active);$('mic').setAttribute('aria-pressed',String(active));$('speech-language').disabled=active||voiceBusy;$('mic-label').textContent=active?'聞き取り中…':'音声で行き先を入力';$('mic-subtitle').textContent=active?'もう一度タップすると終了します':$('speech-language').value==='auto'?'言語を選ばず、そのままお話しください':`タップして、${languages[$('speech-language').value]}でお話しください`}
$('speech-language').onchange=()=>{voiceState(false);$('speech-help').textContent=$('speech-language').value==='auto'?'最大20秒録音し、音声をOpenAIへ送信して自動判定します。停止ボタンはもう一度タップ。':'選択した言語で認識します。認識結果を確認してから検索してください。'};
function acceptTranscript(text){$('destination').value=text;clear();status('認識した目的地：'+text+'。内容を確認して検索してください。')}
async function autoVoice(){
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return status('このブラウザは録音に対応していません。言語を選択するか、キーボードで入力してください。');
  let stream;voiceBusy=true;$('mic').disabled=true;
  try{
    stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
    const current=new MediaRecorder(stream,mime?{mimeType:mime}:{}),chunks=[];recorder=current;
    current.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
    current.onstop=async()=>{
      clearTimeout(recordTimer);stream.getTracks().forEach(track=>track.stop());recorder=null;voiceBusy=true;voiceState(false);$('mic').disabled=true;$('mic-label').textContent='音声を認識しています…';
      try{const audio=new Blob(chunks,{type:current.mimeType||'audio/webm'});if(!audio.size)throw Error('音声が録音されていません。');const form=new FormData();form.append('file',audio,current.mimeType.includes('mp4')?'speech.mp4':'speech.webm');const response=await fetch('/api/transcribe',{method:'POST',body:form});const data=await response.json();if(!response.ok)throw Error(data.error||'音声を認識できませんでした。');acceptTranscript(data.text)}catch(error){status('音声入力に失敗しました：'+error.message)}finally{voiceBusy=false;$('mic').disabled=false;voiceState(false)}
    };
    current.onerror=()=>{if(current.state!=='inactive')current.stop();status('録音に失敗しました。もう一度お試しください。')};
    current.start();voiceBusy=false;$('mic').disabled=false;voiceState(true);status('話し始めてください。最大20秒で停止します。音声は認識のためOpenAIへ送信されます。');recordTimer=setTimeout(()=>{if(current.state==='recording')current.stop()},20000);
  }catch{stream?.getTracks().forEach(track=>track.stop());recorder=null;voiceBusy=false;$('mic').disabled=false;voiceState(false);status('マイクを開始できませんでした。マイクの利用許可を確認してください。')}
}
$('mic').onclick=()=>{
  if(voiceBusy)return;if(recorder?.state==='recording'){recorder.stop();return}if(recognition){recognition.stop();return}if($('speech-language').value==='auto')return autoVoice();
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){$('destination').focus();return status('このブラウザは音声認識に対応していません。端末のキーボードのマイクから入力してください。')}
  const current=new Speech();recognition=current;current.lang=$('speech-language').value;current.interimResults=false;
  current.onstart=()=>{voiceState(true);status(languages[current.lang]+'で目的地をお話しください。')};
  current.onresult=event=>acceptTranscript(event.results[0][0].transcript);
  current.onerror=event=>{const messages={'not-allowed':'マイクの利用が許可されていません。ブラウザの設定を確認してください。','audio-capture':'マイクが見つかりません。','no-speech':'音声を認識できませんでした。もう一度お話しください。',network:'音声認識に接続できませんでした。キーボードで入力してください。',aborted:'音声入力を終了しました。','language-not-supported':'選択した言語はこのブラウザで利用できません。'};status(messages[event.error]||'音声入力に失敗しました。もう一度お試しください。')};
  current.onend=()=>{recognition=null;voiceState(false)};
  try{current.start()}catch{recognition=null;voiceState(false);status('音声入力を開始できませんでした。もう一度お試しください。')}
};
fetch('/api/health').then(response=>response.ok?response.json():null).then(data=>{if(data?.speechConfigured){$('auto-language').disabled=false;$('auto-language').textContent='自動判定（日本語・英語・中国語など）'}}).catch(()=>{});
$('search').onclick=async()=>{const origin=$('origin').value.trim(),destination=$('destination').value.trim();if(!origin||!destination)return status('出発地と目的地を入力してください。');clear();if($('mode').value==='demo')return demo();status('住所とルートを検索しています…');$('search').disabled=true;$('search').textContent='ルートを検索中…';try{const response=await fetch('/api/routes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({origin:originCoords||origin,destination,allowHighway:$('highway').checked})});const data=await response.json();if(!response.ok)throw Error(data.error||'検索に失敗しました。');lastResult=data;routes=data.routes;chosen=0;render();draw();status(`${routes.length}件のルートが見つかりました。${$('highway').checked?'高速道路・有料道路を利用可能。':'高速道路・有料道路を避ける条件です。'}所要時間に渋滞情報は含まれません。`)}catch(error){status('検索できませんでした：'+error.message)}finally{$('search').disabled=false;$('search').textContent='ルートを検索する　→'}};
function demo(){const paths=[[[139.85,35.72],[139.82,35.705],[139.77,35.68]],[[139.85,35.72],[139.86,35.70],[139.77,35.68]],[[139.85,35.72],[139.79,35.74],[139.77,35.68]]];routes=paths.map((coordinates,i)=>({meters:11000+i*1800,seconds:2100+i*240,demo:true,geometry:{type:'LineString',coordinates}}));lastResult={origin:{name:'出発地（サンプル）',coordinates:paths[0][0]},destination:{name:'目的地（サンプル）',coordinates:paths[0][2]}};chosen=0;render();draw();status('デモ表示です。距離・所要時間・ルート線はすべて架空のサンプルです。実際の走行には使用できません。')}
function render(){$('routes').replaceChildren();routes.forEach((route,i)=>{const card=document.createElement('div');card.className='route'+(i===chosen?' selected':'');const title=document.createElement('strong');title.textContent=`${route.demo?'サンプル':''}ルート ${String.fromCharCode(65+i)}　${(route.meters/1000).toFixed(1)} km・約${Math.ceil(route.seconds/60)}分`;card.append(title);const hint=document.createElement('p');hint.className='hint';hint.textContent=route.demo?'デモデータ・実際の走行には使用できません':'道路データによる目安・渋滞情報なし・運賃計算なし';card.append(hint);const select=document.createElement('button');select.textContent=i===chosen?'✓ 選択中':'このルートを選ぶ';select.onclick=()=>{chosen=i;render();draw()};card.append(select);const nav=document.createElement('button');nav.className='secondary';nav.textContent='Google マップで開く';nav.onclick=navigate;card.append(nav);$('routes').append(card)})}
function draw(){if(!map||!lastResult)return;lines.forEach(x=>map.removeLayer(x));markers.forEach(x=>map.removeLayer(x));lines=[];markers=[];routes.forEach((route,i)=>{if(route.geometry?.type!=='LineString')return;const line=L.polyline(route.geometry.coordinates.map(([lon,lat])=>[lat,lon]),{color:['#207b73','#e8b830','#778eab'][i%3],weight:i===chosen?8:4,opacity:i===chosen?1:.6,...(route.demo?{dashArray:'8 6'}:{})}).addTo(map);line.on('click',()=>{chosen=i;render();draw()});lines.push(line)});for(const point of [lastResult.origin,lastResult.destination]){const label=document.createElement('span');label.textContent=point.name;markers.push(L.marker([point.coordinates[1],point.coordinates[0]]).addTo(map).bindPopup(label))}if(lines.length)map.fitBounds(L.featureGroup(lines).getBounds().pad(.12))}
function navigate(){status('Google マップではルートが再計算されます。'+(!$('highway').checked?'「高速道路を使わない」「有料道路を使わない」の設定を再確認してください。':'高速道路の利用について、お客様の同意を確認してください。'));const origin=originCoords?originCoords.slice().reverse().join(','):$('origin').value.trim();const url='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(origin)+'&destination='+encodeURIComponent($('destination').value.trim())+'&travelmode=driving'+(!$('highway').checked?'&avoid=highways%2Ctolls':'');window.open(url,'_blank','noopener,noreferrer')}
