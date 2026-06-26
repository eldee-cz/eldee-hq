const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();
const mime={'.html':'text/html; charset=utf-8','.png':'image/png','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
http.createServer((req,res)=>{let p=decodeURIComponent(req.url.split('?')[0]);if(p==='/')p='/krabice-editor.html';const f=path.join(root,p);
fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end('404');return;}res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Access-Control-Allow-Origin':'*'});res.end(d);});}).listen(8787,()=>console.log('editor na http://localhost:8787'));
