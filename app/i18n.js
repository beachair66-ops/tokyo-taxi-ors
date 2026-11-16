'use strict';
(() => {
  const chinese = {
    '東京タクシールート':'东京出租车路线','一般道を、もっとスムーズに。':'普通道路，轻松出行。',
    '行き先を話して、':'说出目的地，','東京の道を見つけよう。':'找到你的东京路线。','多言語の音声入力と、一般道優先のルート比較。':'多语言语音输入，优先普通道路，比较出行路线。',
    '行き先を設定':'设置目的地','デモモード・サンプルデータ':'演示模式 · 模拟数据','ルート検索モード':'路线查询模式','デモで試す（サンプルルート）':'试用演示（模拟路线）','実際の道路で検索（ORS）':'查询实际道路（ORS）',
    '実際のルート検索にはサービスの設定が必要です。渋滞情報は含まれません。':'实际路线查询需先配置服务，不包含实时拥堵信息。',
    '出発地':'出发地','◎ 現在地を使う':'◎ 使用当前位置','目的地':'目的地','例：銀座駅、羽田空港':'例如：銀座駅、羽田空港',
    '音声入力の言語':'语音输入语言','日本語':'日语','英語':'英语','中国語（簡体字）':'中文（简体）','中国語（繁体字）':'中文（繁体）','自動判定（サービス未設定）':'自动识别（服务未配置）','自動判定（日本語・英語・中国語など）':'自动识别（日语、英语、中文等）',
    '音声で行き先を入力':'语音输入目的地','聞き取り中…':'正在听取…','もう一度タップすると終了します':'再次点击结束录音','言語を選ばず、そのままお話しください':'无需选择语言，直接说话即可',
    '選択した言語で認識します。認識結果を確認してから検索してください。':'按所选语言识别，请确认识别结果后再查询。','最大20秒録音し、音声をOpenAIへ送信して自動判定します。停止ボタンはもう一度タップ。':'最多录音20秒，音频将发送至OpenAI进行自动识别。再次点击即可停止。',
    '高速道路・有料道路を利用する':'允许高速公路及收费道路','初期設定は一般道優先。利用時はお客様に確認してください。':'默认优先普通道路，使用高速或收费道路前请征得乘客同意。','ルートを検索する　→':'查询路线　→','ルートを検索中…':'正在查询路线…','出発地と目的地を確認して、検索してください。':'请确认出发地和目的地后查询。',
    'ルートを比較':'比较路线','距離と所要時間':'距离与预计时间','ここに候補のルートが表示されます。':'候选路线将在此显示。','まずは行き先を設定して検索しましょう。':'请先设置目的地并查询。','地図で確認':'在地图上查看','ルート地図':'路线地图',
    '© OpenStreetMap contributors · 地図上のルートをタップして選択できます。':'© OpenStreetMap contributors · 点击地图上的路线即可选择。','走行中の操作はお控えください。交通標識と実際の道路状況を優先してください。':'请勿在驾驶中操作，以交通标志和实际道路状况为准。','所要時間は渋滞を含まない目安です。Google マップではルートが再計算されます。':'预计时间不含实时拥堵，Google地图会重新规划路线。',
    '地図を読み込めませんでした。インターネット接続を確認してください。':'地图加载失败，请检查网络连接。','条件が変更されました。もう一度検索してください。':'条件已改变，请重新查询。','実際の道路ルート・渋滞情報なし':'实际道路路线 · 无实时拥堵信息','検索モードを変更しました。もう一度検索してください。':'查询模式已切换，请重新查询。',
    '高速道路・有料道路を利用します。事前にお客様へ確認してください。':'已允许高速及收费道路，请先征得乘客同意。','高速道路・有料道路を避ける条件で検索します。':'查询时将避开高速及收费道路。','この端末は位置情報に対応していません。':'此设备不支持定位。','現在地を取得しています。位置情報の利用を許可してください。':'正在获取当前位置，请允许访问位置。','現在地を取得しました。実際の検索時に位置情報をORSへ送信します。':'已获取当前位置，实际查询时会将坐标发送至ORS。','現在地を取得できませんでした。位置情報の許可を確認するか、住所を入力してください。':'定位失败，请检查定位权限或手动输入地址。',
    'このブラウザは録音に対応していません。言語を選択するか、キーボードで入力してください。':'此浏览器不支持录音，请选择语言或使用键盘输入。','音声を認識しています…':'正在识别语音…','音声が録音されていません。':'没有录到声音。','音声を認識できませんでした。':'未能识别语音。','録音に失敗しました。もう一度お試しください。':'录音失败，请重试。','話し始めてください。最大20秒で停止します。音声は認識のためOpenAIへ送信されます。':'请开始说话，最多20秒后自动停止。音频将发送至OpenAI用于语音识别。','マイクを開始できませんでした。マイクの利用許可を確認してください。':'无法启动麦克风，请检查麦克风权限。','このブラウザは音声認識に対応していません。端末のキーボードのマイクから入力してください。':'此浏览器不支持语音识别，请使用系统键盘上的麦克风输入。',
    'マイクの利用が許可されていません。ブラウザの設定を確認してください。':'未获准使用麦克风，请检查浏览器设置。','マイクが見つかりません。':'未找到麦克风。','音声を認識できませんでした。もう一度お話しください。':'未能识别语音，请再说一次。','音声認識に接続できませんでした。キーボードで入力してください。':'无法连接语音识别服务，请使用键盘输入。','音声入力を終了しました。':'语音输入已结束。','選択した言語はこのブラウザで利用できません。':'此浏览器不支持所选识别语言。','音声入力に失敗しました。もう一度お試しください。':'语音输入失败，请重试。','音声入力を開始できませんでした。もう一度お試しください。':'无法开始语音输入，请重试。',
    '出発地と目的地を入力してください。':'请输入出发地和目的地。','住所とルートを検索しています…':'正在查询地址和路线…','検索に失敗しました。':'查询失败。','デモ表示です。距離・所要時間・ルート線はすべて架空のサンプルです。実際の走行には使用できません。':'当前为演示，距离、时间和路线均为模拟数据，不能用于实际驾驶。','出発地（サンプル）':'出发地（模拟）','目的地（サンプル）':'目的地（模拟）','現在地':'当前位置',
    'デモデータ・実際の走行には使用できません':'模拟数据 · 不可用于实际驾驶','道路データによる目安・渋滞情報なし・運賃計算なし':'道路模型估算 · 无实时拥堵 · 不计算车费','✓ 選択中':'✓ 已选择','このルートを選ぶ':'选择此路线','Google マップで開く':'在Google地图中打开',
    'Google マップではルートが再計算されます。「高速道路を使わない」「有料道路を使わない」の設定を再確認してください。':'Google地图会重新规划路线，请再次检查“避开高速公路”和“避开收费道路”设置。','Google マップではルートが再計算されます。高速道路の利用について、お客様の同意を確認してください。':'Google地图会重新规划路线，使用高速前请确认乘客同意。',
    'ルート検索サービスは未設定です。管理者がORS_API_KEYを設定すると利用できます。':'路线服务尚未配置，设置服务端ORS_API_KEY后即可使用。','ルート検索サービスは未設定です。ORS_API_KEYを設定してサーバーを再起動してください。':'路线服务尚未配置，请设置ORS_API_KEY并重启服务器。','自動言語判定は未設定です。日本語・英語・中国語を選んで音声入力してください。':'自动语言识别尚未配置，请先选择日语、英语或中文进行语音输入。','音声ファイルを送信してください。':'请提交音频文件。','音声がありません。':'没有音频。','録音が長すぎます。20秒以内でお話しください。':'录音过大，请在20秒内说完。','対応する音声ファイルを送信してください。':'请提交支持的音频文件。','音声認識サービスを利用できません。設定や利用枠を確認してください。':'语音服务暂不可用，请检查配置及额度。','音声認識に失敗しました。もう一度お試しください。':'语音识别失败，请重试。',
    '日本国内の有効な住所または座標を入力してください。':'请输入日本境内的有效地址或坐标。','日本国内の住所が見つかりません。正式な日本語住所でお試しください。':'未找到日本境内地址，请改用正式日语地址。','リクエストの形式が正しくありません。':'请求格式不正确。','allowHighwayにはtrueまたはfalseを指定してください。':'allowHighway必须为true或false。','走行可能なルートが見つかりませんでした。':'未找到可行驶路线。','ルート検索を利用できません。':'路线查询暂不可用。','ルート検索を利用できません。しばらくしてからお試しください。':'路线服务暂不可用，请稍后重试。','リクエストが大きすぎます。':'请求过大。','JSONの形式が正しくありません。':'JSON格式不正确。'
  };
  function translate(source, language) {
    if(language!=='zh-CN'||typeof source!=='string')return source;
    const text=source.trim();let translated=chinese[text];
    if(translated===undefined){
      let match;
      if((match=text.match(/^タップして、(.+)でお話しください$/)))translated=`点击后，请说${({'日本語':'日语','英語':'英语','中国語':'中文'})[match[1]]||match[1]}`;
      else if((match=text.match(/^(.+)で目的地をお話しください。$/)))translated=`请用${({'日本語':'日语','英語':'英语','中国語':'中文'})[match[1]]||match[1]}说出目的地。`;
      else if((match=text.match(/^認識した目的地：([\s\S]+)。内容を確認して検索してください。$/)))translated=`识别的目的地：${match[1]}。请确认后查询。`;
      else if((match=text.match(/^(サンプル)?ルート ([A-Z])　([\d.]+) km・約(\d+)分$/)))translated=`${match[1]?'模拟':''}路线 ${match[2]}　${match[3]} km · 约${match[4]}分钟`;
      else if((match=text.match(/^(\d+)件のルートが見つかりました。(高速道路・有料道路を利用可能。|高速道路・有料道路を避ける条件です。)所要時間に渋滞情報は含まれません。$/)))translated=`找到${match[1]}条路线。${match[2].includes('利用可能')?'允许高速及收费道路。':'已请求避开高速及收费道路。'}预计时间不含实时拥堵。`;
      else if((match=text.match(/^(検索できませんでした：|音声入力に失敗しました：)([\s\S]+)$/)))translated=(match[1].startsWith('検索')?'查询失败：':'语音输入失败：')+translate(match[2],language);
      else if((match=text.match(/^ORSに接続できません（(\d+)）。サービス設定・利用枠・入力住所を確認してください。$/)))translated=`无法连接ORS（${match[1]}），请检查服务配置、额度和输入地址。`;
    }
    return translated===undefined?source:source.replace(text,translated);
  }
  globalThis.TaxiI18n={translate};
  if(typeof document==='undefined')return;
  let locale='ja';try{if(localStorage.getItem('taxi-ui-language')==='zh-CN')locale='zh-CN'}catch{}
  const originals=new WeakMap(),attributes=new WeakMap();
  function text(node){if(node.parentElement?.closest('script,style,[data-no-translate]'))return;let record=originals.get(node);if(!record||node.nodeValue!==record.rendered)record={source:node.nodeValue};const rendered=translate(record.source,locale);record.rendered=rendered;originals.set(node,record);if(node.nodeValue!==rendered)node.nodeValue=rendered}
  function element(node){if(node.nodeType!==1||node.closest('[data-no-translate]'))return;let record=attributes.get(node);if(!record){record={};for(const name of ['placeholder','aria-label','title'])if(node.hasAttribute(name))record[name]=node.getAttribute(name);attributes.set(node,record)}for(const [name,value]of Object.entries(record))node.setAttribute(name,translate(value,locale))}
  function walk(root){if(root.nodeType===3){text(root);return}element(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(node.nodeType===3)text(node);else element(node)}}
  const select=document.getElementById('ui-language');
  function apply(){document.documentElement.lang=locale;document.title=locale==='ja'?'東京タクシールート':'东京出租车路线';select.value=locale;walk(document.body)}
  select.addEventListener('change',()=>{locale=select.value==='zh-CN'?'zh-CN':'ja';try{localStorage.setItem('taxi-ui-language',locale)}catch{}apply()});
  new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')text(record.target);else for(const node of record.addedNodes)walk(node)}}).observe(document.body,{childList:true,subtree:true,characterData:true});
  apply();
})();
