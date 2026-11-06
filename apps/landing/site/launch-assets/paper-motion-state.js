export const demoBudget = 200000;
export const demoExamples = Object.freeze({
  coffee: Object.freeze({ label: 'Cà phê sáng', amount: 35000 }),
  groceries: Object.freeze({ label: 'Đi chợ', amount: 80000 }),
  transport: Object.freeze({ label: 'Di chuyển', amount: 20000 }),
});
export function emptyDemo() { return { total: 0, count: 0, last: null }; }
export function addDemoExpense(state, id) {
  if (!Object.hasOwn(demoExamples, id)) throw new RangeError('Unknown demo expense');
  const last = demoExamples[id];
  return { total: state.total + last.amount, count: state.count + 1, last };
}
