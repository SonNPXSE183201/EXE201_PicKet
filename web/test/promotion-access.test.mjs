import assert from 'node:assert/strict';
import test from 'node:test';
import {canViewAdminSection} from '../src/features/admin/admin-permissions.ts';
test('promotions page requires promotions.manage, not a read-only permission', () => {
  assert.equal(canViewAdminSection('analyst', 'promotions', ['promotions.manage']), true);
  assert.equal(canViewAdminSection('analyst', 'promotions', ['revenue.read', 'promotions.read']), false);
  assert.equal(canViewAdminSection('analyst', 'permissions', ['permissions.manage']), true);
  assert.equal(canViewAdminSection('analyst', 'revenue', ['revenue.read']), true);
});
