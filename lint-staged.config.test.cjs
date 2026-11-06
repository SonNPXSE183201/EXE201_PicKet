const assert = require('node:assert/strict');
const test = require('node:test');
test('project-wide TypeScript gates do not receive staged filenames', () => {
  const config = require('./lint-staged.config.cjs');
  for (const pattern of ['apps/mobile/**/*.{js,jsx,ts,tsx}', 'web/**/*.{js,jsx,ts,tsx}']) {
    assert.equal(typeof config[pattern], 'function');
    const commands = config[pattern](['file with spaces.tsx']);
    assert.equal(commands.length, 2);
    assert.ok(commands.every(command => !command.includes('file with spaces')));
    assert.ok(commands[1].includes('typecheck'));
  }
});
