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
