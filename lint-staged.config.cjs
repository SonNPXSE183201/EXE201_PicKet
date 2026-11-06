// Functions intentionally suppress lint-staged's automatic filename arguments:
// tsc must load the project tsconfig rather than compile isolated input files.
module.exports = {
  'apps/mobile/**/*.{js,jsx,ts,tsx}': () => [
    'npm run lint --prefix apps/mobile',
    'npm run typecheck --prefix apps/mobile',
  ],
  'web/**/*.{js,jsx,ts,tsx}': () => [
    'npm run lint --prefix web',
    'npm run typecheck --prefix web',
  ],
  'apps/api/**/*.dart': ['dart format --output=none --set-exit-if-changed'],
};
