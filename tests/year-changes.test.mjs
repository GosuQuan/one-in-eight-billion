import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advanceYear, choose, netWorth } from '../src/engine.js';
import { markYearEnd, yearChanges, deltaHTML, yearChangeHTML, yearLineHTML } from '../src/year-changes.js';

const live = (seed, mark) => {
  const life = createLife({ seed, country: 'BR' });
  for (let guard = 0; guard < 400 && !life.dead && life.age < 60; guard++) {
    if (life.pending) { choose(life, 0); continue; }
    if (mark) markYearEnd(life);
    advanceYear(life);
  }
  return life;
};

test('keeping the yearly numbers does not change the life', () => {
  for (const seed of ['moved-1', 'moved-2', 'moved-3']) {
    const plain = live(seed, false), marked = live(seed, true);
    assert.ok(Object.keys(marked.yearEnds).length > 10);
    delete marked.yearEnds;
    assert.deepEqual(marked, plain);
  }
});

test('the change of a year is the end of that year minus the end of the one before', () => {
  const life = live('moved-1', true);
  const age = life.age - 1, before = life.yearEnds[age - 1], after = life.yearEnds[age];
  const ch = yearChanges(life, age);
  assert.equal(ch.health, after[0] - before[0]);
  assert.equal(ch.cash, after[4] - before[4]);
  assert.equal(ch.net, after[7] - before[7]);
  // the current year runs from last year's end to now
  assert.equal(yearChanges(life).net, netWorth(life) - life.yearEnds[life.age - 1][7]);
  assert.equal(yearChanges(life, 0), null);
  assert.equal(yearChanges(createLife({ seed: 'fresh' })), null);
});

test('arrows, amounts and colours', () => {
  assert.equal(deltaHTML('health', 2.6), '<span class="delta up">▲3</span>');
  assert.equal(deltaHTML('happiness', -1.2), '<span class="delta down">▼1</span>');
  assert.equal(deltaHTML('social', 0.4), '');
  assert.match(deltaHTML('cash', 1500), /class="delta up">▲\$1,500</);
  assert.match(deltaHTML('debt', 300), /class="delta down">▲\$300</);
  assert.match(deltaHTML('debt', -300), /class="delta up">▼\$300</);
  const life = live('moved-2', true);
  assert.match(yearChangeHTML(life), /今年的变化/);
  assert.match(yearLineHTML(life, life.age - 1), new RegExp(`${life.age - 1} 岁这一年的变化`));
});
