import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('web logout requests local scope so it does not revoke the mobile session',()=>{const code=readFileSync(new URL('../src/app/dashboard/actions.ts',import.meta.url),'utf8');assert.match(code,/signOut\(\{\s*scope:\s*["']local["']\s*\}\)/);});
