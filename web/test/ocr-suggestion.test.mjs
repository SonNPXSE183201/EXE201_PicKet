import test from 'node:test';import assert from 'node:assert/strict';
import {ocrSuggestion} from '../src/core/finance/ocr-suggestion.ts';
test('worker amount/date/merchant fields populate web review without losing native contract',()=>assert.deepEqual(ocrSuggestion({merchant:'Cửa hàng',amount:123000,date:'2026-10-21',confidence:.9,rawText:'private'}),{merchant:'Cửa hàng',amount:'123000',date:'2026-10-21'}));
test('invalid provider suggestions never populate money or dates',()=>assert.deepEqual(ocrSuggestion({merchant:{bad:1},amount:Infinity,date:'not-a-date'}),{}));
