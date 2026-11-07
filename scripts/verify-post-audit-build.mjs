/** Isolated mock backend; never load the workspace .env.local for this build. */
import{createServer}from'node:http';import{spawn}from'node:child_process';import{writeFile}from'node:fs/promises';import{resolve}from'node:path';
const target=process.argv[2];if(!target)throw Error('Supply isolated copy directory');
const requests=[];const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type','application/json');
 if(req.url.includes('store_exchange_public_v1'))return res.end('null');
 if(req.url.includes('claim_store_exchange_refresh_v1'))return res.end('{}');
 if(req.url.includes('/auth/')){res.statusCode=401;return res.end('{"message":"No test session"}');}
 if(req.headers.accept?.includes('vnd.pgrst.object'))return res.end('{}');res.end('[]');
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:`http://127.0.0.1:${server.address().port}`,NEXT_PUBLIC_SUPABASE_ANON_KEY:'isolated-public-test-key',SUPABASE_SERVICE_ROLE_KEY:'isolated-service-test-key',COMMERCE_CHECKOUT_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'};
for(const key of Object.keys(env))if(/^(MERCADOPAGO|RESEND|CRON_SECRET|SUPPLIER_TRACKING_SECRET|VERCEL_TOKEN)/.test(key))delete env[key];
try{const child=spawn(process.execPath,[resolve(target,'node_modules/next/dist/bin/next'),'build'],{cwd:target,env,stdio:'inherit',windowsHide:true});const code=await new Promise((r,j)=>{child.on('error',j);child.on('exit',r);});await writeFile(resolve(target,'mock-build-requests.json'),JSON.stringify(requests,null,2));if(code)process.exitCode=code;}finally{server.close();}
