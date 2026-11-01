import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function reservePort(){const server=http.createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function waitFor(url,child){for(let i=0;i<60;i++){if(child.exitCode!==null)throw new Error('Test API process exited before it was ready.');try{const response=await fetch(url);if(response.ok)return response;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out waiting for the test API server.');}

test('AI proxy keeps the key server-side and sends grounded tutor context',async t=>{
  const apiPort=await reservePort(),providerPort=await reservePort();let providerAuthorization='',providerPayload=null;
  const provider=http.createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;providerAuthorization=req.headers.authorization||'';providerPayload=JSON.parse(body);res.writeHead(200,{'content-type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:'A codon is a group of three RNA letters.'}}]}));});
  await new Promise(resolve=>provider.listen(providerPort,'127.0.0.1',resolve));
  const child=spawn(process.execPath,[path.join(root,'server/index.js')],{cwd:root,env:{...process.env,HOST:'127.0.0.1',GENEVISION_API_PORT:String(apiPort),AI_API_KEY:'unit-test-secret',AI_BASE_URL:`http://127.0.0.1:${providerPort}/v1`,AI_MODEL:'mock-tutor-model'},stdio:'ignore'});
  t.after(async()=>{child.kill('SIGTERM');await new Promise(resolve=>provider.close(resolve));});
  const healthResponse=await waitFor(`http://127.0.0.1:${apiPort}/api/health`,child);const health=await healthResponse.json();
  assert.equal(health.aiConfigured,true);assert.equal(JSON.stringify(health).includes('unit-test-secret'),false);
  const response=await fetch(`http://127.0.0.1:${apiPort}/api/ai/chat`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:'What is a codon?',context:{gene:{symbol:'HBB'},mutation:{effect:'Amino acid changed'}}})});
  assert.equal(response.status,200);assert.match((await response.json()).answer,/group of three/);
  assert.equal(providerAuthorization,'Bearer unit-test-secret');assert.equal(providerPayload.model,'mock-tutor-model');
  assert.match(providerPayload.messages[0].content,/not diagnose|do not diagnose/i);assert.match(providerPayload.messages[0].content,/HBB/);
});
