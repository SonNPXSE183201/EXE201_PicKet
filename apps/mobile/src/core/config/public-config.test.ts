import assert from 'node:assert/strict';
import test from 'node:test';
import {readPublicConfig}from './public-config';
test('local Auth endpoint is restricted to development emulator/loopback',()=>{
 const saved={...process.env};const old=(globalThis as Record<string,unknown>).__DEV__;
 try{
  process.env.EXPO_PUBLIC_API_URL='http://10.0.2.2:8089';process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';
  process.env.EXPO_PUBLIC_SUPABASE_URL='http://10.0.2.2:55430';
  (globalThis as Record<string,unknown>).__DEV__=true;assert.ok(readPublicConfig());
  (globalThis as Record<string,unknown>).__DEV__=false;assert.equal(readPublicConfig(),null);
  (globalThis as Record<string,unknown>).__DEV__=true;process.env.EXPO_PUBLIC_SUPABASE_URL='http://remote.example.test';assert.equal(readPublicConfig(),null);
 }finally{
  for(const key of ['EXPO_PUBLIC_API_URL','EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY']){if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}
  (globalThis as Record<string,unknown>).__DEV__=old;
 }
});
