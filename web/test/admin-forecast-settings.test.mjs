import assert from 'node:assert/strict';
import test from 'node:test';
import {canManageForecast, forecastSettingsSummary, parseForecastSettingsForm} from '../src/features/admin/forecast-settings-form.ts';

const form = (fields) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const item of [v].flat()) data.append(k, String(item));
  return data;
};
const valid = {enabled: 'on', minHistoryDays: '14', lookbackMonths: '3', accessPlans: ['plus', 'pro', 'plus'], scenarioPlans: ['pro', 'plus', 'pro'], revision: '2', reason: 'Mở kịch bản cho Plus'};

test('forecast settings form becomes the API body', () => {
  assert.deepEqual(parseForecastSettingsForm(form(valid)), {enabled: true, minHistoryDays: 14, lookbackMonths: 3, accessPlans: ['plus', 'pro'], scenarioPlans: ['pro', 'plus'], revision: 2, reason: 'Mở kịch bản cho Plus'});
  const off = parseForecastSettingsForm(form({...valid, enabled: undefined, scenarioPlans: []}));
  assert.equal(off.enabled, false);
  assert.deepEqual(off.scenarioPlans, []);
  assert.deepEqual(parseForecastSettingsForm(form({...valid, accessPlans: []})).accessPlans, []);
  assert.deepEqual(parseForecastSettingsForm(form({...valid, accessPlans: ['free', 'pro']})).accessPlans, ['free', 'pro']);
  assert.throws(() => parseForecastSettingsForm(form({...valid, accessPlans: ['vip']})), /access/);
});

test('out-of-range forecast settings are rejected before calling the API', () => {
  for (const [field, value, code] of [['minHistoryDays', '0', 'history'], ['minHistoryDays', '91', 'history'], ['lookbackMonths', '7', 'lookback'], ['scenarioPlans', ['vip'], 'plans'], ['reason', 'abc', 'reason'], ['revision', 'x', 'revision']]) {
    assert.throws(() => parseForecastSettingsForm(form({...valid, [field]: value})), new RegExp(code));
  }
});

test('only forecast.manage (or the bootstrap owner) may edit forecast settings', () => {
  assert.equal(canManageForecast('support', ['forecast.manage']), true);
  assert.equal(canManageForecast('owner', ['settings.read']), false);
  assert.equal(canManageForecast('owner'), true);
  assert.match(forecastSettingsSummary({enabled: true, minHistoryDays: 14, lookbackMonths: 3, scenarioPlans: ['pro']}), /bật.*14 ngày.*3 tháng.*Pro/);
});
