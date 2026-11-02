import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife } from '../src/engine.js';
import { memorialOf, formatPlay } from '../src/memorial.js';

test('play time is words, not a bare millisecond count', () => {
  assert.equal(formatPlay(0), '');
  assert.equal(formatPlay(90000), '1 分 30 秒');
});

test('a stayed life still names place, scenes, region and a question', () => {
  const life = createLife({ seed: 'card-stay', country: 'IN' });
  life.age = 79; life.job = '本地职员'; life.playMs = 90000;
  const card = memorialOf(life);
  assert.match(card.playBody, /1 分 30 秒/);
  assert.match(card.playBody, /79 年/);
  assert.match(card.pathBody, /浦那/);
  assert.match(card.sceneBody, /浦那的家/);
  assert.match(card.regionBody, /南亚/);
  assert.match(card.peopleBody, new RegExp(life.family.mother.name));
  assert.match(card.fertility, /没有孩子/);
  assert.match(card.status, /本地职员/);
  assert.match(card.philosophy, /。/);
  assert.equal(card.questions.length, 2);
  assert.match(card.questions[0], /说过/);
  assert.match(card.questions[0], /你会不会是这样/);
  assert.match(card.questions[0], /浦那/);
});

test('moves, a child and a trip show up on the card', () => {
  const life = createLife({ seed: 'card-move', country: 'IN' });
  life.age = 46;
  life.systems.migration.push({ from: 'IN', to: 'US', age: 35, status: 'temporary' });
  life.country = { ...life.country, id: 'US', name: '美国', city: '芝加哥', region: '北美' };
  life.children.push({ name: '辛格普里娅', age: 4 });
  life.travels.push({ id: 'jp', name: '日本 · 京都', place: '京都', age: 28 });
  life.systems.scenes = [{ text: '芝加哥医院' }];
  life.playMs = 0;
  const card = memorialOf(life);
  assert.match(card.pathBody, /浦那/);
  assert.match(card.pathBody, /芝加哥/);
  assert.match(card.sceneBody, /京都/);
  assert.match(card.sceneBody, /芝加哥医院/);
  assert.match(card.regionBody, /南亚/);
  assert.match(card.regionBody, /北美/);
  assert.match(card.regionBody, /东亚/);
  assert.match(card.fertility, /辛格普里娅/);
  assert.match(card.questions[1], /辛格普里娅/);
  assert.match(card.questions[1], /你会不会/);
  assert.match(card.playBody, /计时从你打开这一生开始/);
});

test('memorial states the length of a life in years and roughly in days', () => {
  const life = createLife({ seed: 'days-1', country: 'CN' });
  life.age = 79; life.dead = true; life.deathAge = 79; life.deathCause = '身体逐渐衰老';
  const card = memorialOf(life);
  assert.ok(card.lifespan, 'lifespan entry exists');
  assert.ok(card.lifespan.title.includes('长度'));
  const days = Math.round(79 * 365.25);
  assert.ok(card.lifespan.body.includes(days.toLocaleString('zh-CN')), card.lifespan.body);
  assert.ok(card.lifespan.body.includes('游戏换算'), 'labels the conversion as a game estimate');
});

test('the grain derives four word-pairs from the record', () => {
  const life = createLife({ seed: 'grain-1', country: 'CN' });
  life.age = 70; life.dead = true; life.deathAge = 70; life.deathCause = '身体逐渐衰老';
  life.log.push({ age: 30, title: '给家里汇了一笔', text: 'need 汇给 mother', type: 'family' });
  const card = memorialOf(life);
  assert.ok(card.grain, 'grain exists');
  assert.equal(card.grain.pairs.length, 4, 'four pairs');
  for (const g of card.grain.pairs) {
    assert.ok(g.a && g.b, 'pair has both words');
    assert.ok(g.lean >= -100 && g.lean <= 100, `lean in range: ${g.lean}`);
  }
  assert.ok(card.grain.title.length > 0, 'grain title present');
  assert.ok(card.grain.body.includes('／'), 'grain body lists pairs');
  // a life with moves should lean 闯荡 on the second pair
  const moved = createLife({ seed: 'grain-2', country: 'CN' });
  moved.age = 40; moved.dead = true; moved.deathAge = 40; moved.deathCause = '身体逐渐衰老';
  moved.systems.migration.push({ from: 'CN', to: 'US', age: 25, status: 'arrived' });
  const card2 = memorialOf(moved);
  const pair2 = card2.grain.pairs[1];
  assert.ok(pair2.lean < 0, `mover leans away from 守在这里: ${pair2.lean}`);
});

test('memorial names how long the partnership lasted and whether parents were cared for', () => {
  const life = createLife({ seed: 'py-1', country: 'CN' });
  life.age = 60; life.dead = true; life.deathAge = 60; life.deathCause = '身体逐渐衰老';
  life.partner = { name: '林夏', sex: '女', age: 58, alive: true, bond: 80, togetherSince: 24 };
  life.log.push({ age: 40, title: '陪母亲去医院', text: '你陪母亲去医院复查，来回花了一整天。', type: 'family' });
  const card = memorialOf(life);
  assert.ok(card.peopleBody.includes('林夏'), 'partner named');
  assert.ok(card.peopleBody.includes('共同度过 36 年'), `partner years: ${card.peopleBody}`);
  assert.ok(card.contribution.includes('照顾过年迈的父母'), `cared parents: ${card.contribution}`);
  // no partner: no years phrase
  const solo = createLife({ seed: 'py-2', country: 'CN' });
  solo.age = 50; solo.dead = true; solo.deathAge = 50; solo.deathCause = '身体逐渐衰老'; solo.partner = null;
  const c2 = memorialOf(solo);
  assert.ok(!c2.peopleBody.includes('共同度过'), 'no years without partner');
});
