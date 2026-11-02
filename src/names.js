// Names for new people, without giving two people in one life the same name.
// Each country has only a few given names and surnames, so independent draws clash easily.
// The draw is the engine's own: up to nine random tries, then the first free combination.
// This module also counts friends, companions and people named moments ago (the cast of one scene,
// not stored on the life yet), so a friend is not named like the player or like another friend.
import { tr } from './i18n.js';

const recent = new WeakMap();

function namesInUse(l) {
  const f = l.family || {};
  const people = [l, f.mother, f.father, ...(f.siblings || []), l.partner, ...(l.children || []), ...(l.friends || []), ...(l.companions || [])];
  const used = new Set(people.filter(p => p && typeof p === 'object' && p.name).map(p => p.name));
  for (const n of recent.get(l) || []) used.add(n);
  return used;
}

export function personName(l, country, sex, roll) {
  const names = country?.names || { surnames: ['林'], male: ['一'], female: ['一'] };
  const pool = names[sex === '男' ? 'male' : 'female'];
  const draw = xs => xs[Math.floor(roll(l) * xs.length)];
  const full = (surname, given) => tr('{surname}{given}', { surname, given, country: country?.id, sex });
  const taken = namesInUse(l);
  const keep = name => { recent.set(l, [...(recent.get(l) || []), name].slice(-6)); return name; };
  let name = '';
  for (let i = 0; i < 9; i++) { name = full(draw(names.surnames), draw(pool)); if (!taken.has(name)) return keep(name); }
  for (const surname of names.surnames) for (const given of pool) if (!taken.has(full(surname, given))) return keep(full(surname, given));
  return keep(name + '·');
}
