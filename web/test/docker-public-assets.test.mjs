import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('standalone Docker runtime includes public assets alongside the monorepo web server',async()=>{
 const dockerfile=await readFile(new URL('../Dockerfile',import.meta.url),'utf8');
 const runtime=dockerfile.split('AS runtime')[1];
 assert.match(runtime,/COPY --from=build --chown=nextjs:nodejs \/workspace\/web\/public \.\/web\/public/);
 assert.match(runtime,/CMD \["node", "web\/server\.js"\]/);
});
