import assert from 'node:assert/strict';
import test from 'node:test';
import {exportCsv} from '../src/features/admin/export-csv.ts';
import {canViewAdminSection}from '../src/features/admin/admin-permissions.ts';
test('CSV quotes cells and neutralizes spreadsheet formulas',()=>{
 const csv=exportCsv([{title:'=HYPERLINK("https://bad")',note:'line\nnext',amount:42},{title:' +SUM(A1)',note:'safe'}]);
 assert.ok(csv.startsWith('\ufeff'));
 assert.ok(csv.includes('"\'=HYPERLINK(""https://bad"")"'));
 assert.ok(csv.includes('"\' +SUM(A1)"'));
 assert.ok(csv.includes('"line\nnext"'));
 assert.ok(csv.includes('"42"'));
});
test('front-end navigation follows supplied database capabilities',()=>{
 assert.equal(canViewAdminSection('analyst','users'),false);
 assert.equal(canViewAdminSection('analyst','acquisition',['acquisition.read']),true);
 assert.equal(canViewAdminSection('content','billing'),false);
 assert.equal(canViewAdminSection('support','staff'),false);
 assert.equal(canViewAdminSection('owner','staff'),true);
 assert.equal(canViewAdminSection(null,'overview'),false);
});
