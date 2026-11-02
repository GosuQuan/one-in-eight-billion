import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advanceYear, choose, summarize } from '../src/engine.js';

const eras = ['now', 'past', 'future', 'any'];
// Plays a life, answering every choice with a seed-dependent option, and reports each step.
function play(seed, untilAge = 200, onStep = () => {}) {
  const life = createLife({ seed, era: eras[seed % 4], mode: seed % 2 ? 'birth' : 'pop' });
  let choices = 0;
  for (let n = 0; n < 400 && !life.dead && life.age < untilAge; n++) {
    if (life.pending) { choose(life, (seed + n) % life.pending.options.length); choices++; }
    else advanceYear(life);
    onStep(life);
  }
  return { life, choices };
}

test('a child never owes money; the family covers what the child cannot pay', () => {
  let covered = 0;
  for (let seed = 1; seed <= 150; seed++) {
    let firstReserve = null;
    const { life } = play(seed, 18, l => {
      assert.equal(l.age < 18 ? (l.debt || 0) : 0, 0, `seed ${seed}: debt ${l.debt} at age ${l.age}`);
      if (firstReserve == null && l.finance) firstReserve = l.finance.familyReserve;
    });
    if (life.finance && firstReserve != null && life.finance.familyReserve < firstReserve) covered++;
  }
  assert.ok(covered > 0, 'some childhood costs were paid by the family');
});

test('people in one life do not share a name', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const { life: l } = play(seed);
    const f = l.family || {};
    const people = [l, f.mother, f.father, ...(f.siblings || []), l.partner, ...(l.children || []), ...(l.friends || [])].filter(p => p?.name);
    const owner = new Map();
    for (const p of people) {
      const who = p.id || p; // the partner is a copy of a friend and keeps the friend's id
      if (owner.has(p.name)) assert.ok(owner.get(p.name) === who, `seed ${seed}: two people named ${p.name}`);
      owner.set(p.name, who);
    }
  }
});

test('moments worth remembering leave market news out', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { life } = play(seed);
    assert.equal(summarize(life).highlights.filter(e => e.type === 'market').length, 0, `seed ${seed}`);
  }
});

test('every choice counts as a decision, not only the age milestones', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const { life, choices } = play(seed);
    assert.equal(life.decisions, choices, `seed ${seed}`);
    assert.ok(life.decisions >= life.log.filter(e => e.type === 'consequence').length);
  }
});
