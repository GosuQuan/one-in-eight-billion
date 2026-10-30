// Names for new people, without giving two people in one life the same name.
// Each country has only a few given names and surnames, so independent draws used to clash
// (two friends with one name, or a friend named like the player). The draws stay exactly as before,
// surname first, then given name, and a taken name moves on to the next free combination in the lists.
// The random sequence is unchanged, so every other outcome of a seeded life is unchanged too.
import { tr } from './i18n.js';

// People made in the same moment (the player and parents at birth, the cast of one scene)
// are not stored on the life yet, so the last few names are remembered here.
const recent = new WeakMap();

function namesInUse(l) {
  const f = l.family || {};
  const people = [l, f.mother, f.father, ...(f.siblings || []), l.partner, ...(l.children || []), ...(l.friends || []), ...(l.companions || [])];
  const used = new Set(people.filter(p => p && typeof p === 'object' && p.name).map(p => p.name));
  for (const n of recent.get(l) || []) used.add(n);
  return used;
}

export function personName(l, country, sex, roll) {
  const surnames = country.names.surnames, given = country.names[sex === '男' ? 'male' : 'female'];
  const si = Math.floor(roll(l) * surnames.length), gi = Math.floor(roll(l) * given.length);
  const make = i => tr('{surname}{given}', { surname: surnames[Math.floor(i / given.length)], given: given[i % given.length], country: country.id, sex });
  const used = namesInUse(l), total = surnames.length * given.length, first = si * given.length + gi;
  let name = make(first);
  for (let k = 1; k < total && used.has(name); k++) name = make((first + k) % total);
  if (used.has(name)) name = make(first);
  recent.set(l, [...(recent.get(l) || []), name].slice(-6));
  return name;
}
