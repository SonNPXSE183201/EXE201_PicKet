import assert from 'node:assert/strict';
import test from 'node:test';
import { forecastAccess, parseForecastSettings, defaultForecastSettings } from '../../packages/domain-ts/src/forecast-settings-parse.ts';

test('forecast gating covers disabled, local, Free, paid and older APIs', () => {
  for (const enabled of [false, true]) for (const signedIn of [false, true]) for (const allowed of [false, true, undefined]) {
    assert.equal(forecastAccess({enabled, signedIn, allowed}), !enabled ? 'hidden' : !signedIn ? 'signIn' : allowed === false ? 'locked' : 'full');
  }
  const old = {enabled: true, minHistoryDays: 14, lookbackMonths: 3, scenario: true};
  assert.equal(forecastAccess(parseForecastSettings(old, true)), 'full');
  assert.equal(forecastAccess(parseForecastSettings(old, false)), 'signIn');
  assert.equal(forecastAccess(defaultForecastSettings), 'signIn');
});
