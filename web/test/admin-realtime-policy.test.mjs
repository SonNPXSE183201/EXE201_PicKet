import assert from 'node:assert/strict';
import test from 'node:test';
import {realtimeAffects, isEditing} from '../src/features/admin/realtime-policy.ts';

test('feed events refresh only the screens that show that data', () => {
  assert.equal(realtimeAffects('users', 'users'), true);
  assert.equal(realtimeAffects('users', 'overview'), true);
  assert.equal(realtimeAffects('users', 'audit'), false);
  assert.equal(realtimeAffects('payments', 'revenue'), true);
  assert.equal(realtimeAffects('records', 'incidents'), true);
  assert.equal(realtimeAffects('analytics', 'engagement'), true);
  assert.equal(realtimeAffects('unknown', 'overview'), false);
  assert.equal(realtimeAffects(undefined, 'overview'), false);
});

test('a refresh waits while the admin is typing', () => {
  assert.equal(isEditing({tagName: 'INPUT', type: 'text'}), true);
  assert.equal(isEditing({tagName: 'TEXTAREA'}), true);
  assert.equal(isEditing({tagName: 'SELECT'}), true);
  assert.equal(isEditing({tagName: 'INPUT', type: 'checkbox'}), false);
  assert.equal(isEditing({tagName: 'BUTTON'}), false);
  assert.equal(isEditing(null), false);
});
