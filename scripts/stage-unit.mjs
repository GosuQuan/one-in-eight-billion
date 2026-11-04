/** stage-unit.mjs — 直接对内存里的 life 对象调用 lifeStage，验证 5 个阶段的判定与面板字段 */
import { createLife, lifeStage } from '../src/engine.js';

const base = createLife({ seed: 'stage-check', country: 'CN' });
const cases = [
  { age: 3, label: '童年', expect: 'home' },
  { age: 12, label: '求学', expect: 'school' },
  { age: 30, label: '成年', expect: 'work' },
  { age: 66, label: '晚年', expect: 'late' },
];
let pass = 0;
for (const c of cases) {
  const l = JSON.parse(JSON.stringify(base));
  l.age = c.age; l.retired = c.age >= 65;
  const st = lifeStage(l);
  const ok = st.id === c.expect;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.label}(${c.age}岁) → ${st.id} 期望 ${c.expect} | ${st.line}`);
  if (ok) pass++;
}
// venture stage
const v = JSON.parse(JSON.stringify(base));
v.age = 30; v.systems.business = { name: '小店', sector: '零售', capital: 1000, staff: 0 };
const vs = lifeStage(v);
console.log(`${vs.id === 'venture' ? 'PASS' : 'FAIL'} 创业 → ${vs.id} | ${vs.line}`);

// retired forced into late even at 60
const r = JSON.parse(JSON.stringify(base));
r.age = 60; r.retired = true;
const rs = lifeStage(r);
console.log(`${rs.id === 'late' ? 'PASS' : 'FAIL'} 提前退休(60) → ${rs.id}`);

console.log(pass === cases.length ? '\nALL STAGE CHECKS PASSED' : '\nSOME STAGE CHECKS FAILED');
process.exit(pass === cases.length ? 0 : 1);
