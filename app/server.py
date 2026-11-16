import json, os, urllib.request, urllib.parse, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

ROOT=Path(__file__).resolve().parent
API='https://api.openrouteservice.org'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def send_json(self,code,obj):
        data=json.dumps(obj,ensure_ascii=False).encode();self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if self.path.startswith('/api/health'):
            return self.send_json(200,{'configured':bool(os.getenv('ORS_API_KEY','').strip()),'speechConfigured':False})
        return super().do_GET()
    def do_POST(self):
        if self.path!='/api/routes':return self.send_json(404,{'error':'Not found'})
        key=os.getenv('ORS_API_KEY','').strip()
        if not key:return self.send_json(503,{'error':'ルート検索サービスは未設定です。ORS_API_KEYを設定してサーバーを再起動してください。'})
        try:
            size=int(self.headers.get('Content-Length','0'))
            if not 0<size<10000:raise ValueError('リクエストのサイズが正しくありません。')
            req=json.loads(self.rfile.read(size)); origin=req['origin'];dest=req['destination'];allow=req.get('allowHighway') is True
            def resolve(item):
                if isinstance(item,list) and len(item)==2:
                    lon,lat=map(float,item)
                    if not (120<lon<155 and 20<lat<47):raise ValueError('日本国内の座標を入力してください。')
                    return [lon,lat], '現在地'
                if not isinstance(item,str) or not 2<=len(item)<=180:raise ValueError('有効な日本の住所を入力してください。')
                query=urllib.parse.urlencode({'api_key':key,'text':item,'boundary.country':'JPN','size':1})
                result=fetch(API+'/geocode/search?'+query)
                features=result.get('features',[])
                if not features:raise ValueError('住所が見つかりません：'+item+'。正式な日本語住所でお試しください。')
                f=features[0];return f['geometry']['coordinates'],f['properties'].get('label',item)
            a,an=resolve(origin);b,bn=resolve(dest)
            payload={'coordinates':[a,b],'alternative_routes':{'target_count':3,'share_factor':0.6,'weight_factor':1.8},'instructions':False}
            if not allow:payload['options']={'avoid_features':['highways','tollways']}
            try:
                result=fetch(API+'/v2/directions/driving-car/geojson',payload,key)
            except UpstreamError as e:
                # Alternative routes can be unavailable for some locations; retry one real route.
                if e.code not in (400,404):raise
                payload.pop('alternative_routes',None)
                result=fetch(API+'/v2/directions/driving-car/geojson',payload,key)
            routes=[]
            for i,f in enumerate(result.get('features',[])):
                summary=f.get('properties',{}).get('summary',{})
                routes.append({'id':i,'meters':summary.get('distance'), 'seconds':summary.get('duration'),'geometry':f.get('geometry')})
            if not routes:raise ValueError('走行可能なルートが見つかりませんでした。')
            return self.send_json(200,{'routes':routes,'origin':{'name':an,'coordinates':a},'destination':{'name':bn,'coordinates':b},'allowHighway':allow,'source':'openrouteservice','liveTraffic':False})
        except (ValueError,KeyError,TypeError) as e:return self.send_json(400,{'error':str(e)})
        except UpstreamError as e:return self.send_json(502,{'error':f'ORSサービスエラー（{e.code}）。設定と利用枠を確認してください。'})
        except Exception:return self.send_json(502,{'error':'ネットワークまたはサービスを利用できません。しばらくしてからお試しください。'})
class UpstreamError(Exception):
    def __init__(self,code,message):self.code=code;self.message=message

def fetch(url,body=None,key=None):
    headers={'User-Agent':'TokyoTaxiRouteMVP/2.0','Accept':'application/json'}
    data=None
    if body is not None:
        data=json.dumps(body).encode();headers.update({'Authorization':key,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(urllib.request.Request(url,data=data,headers=headers),timeout=25) as r:return json.load(r)
    except urllib.error.HTTPError as e:raise UpstreamError(e.code,e.read().decode('utf-8','replace'))
if __name__=='__main__':
    port=int(os.getenv('PORT','8000'));print(f'Open http://localhost:{port} | ORS key configured: {bool(os.getenv("ORS_API_KEY"))}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
