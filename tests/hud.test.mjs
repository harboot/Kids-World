import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { missionHudFixture } from './helpers/mission-hud.mjs';

const apples = { id: 'apples', title: 'Collect and deliver apples', current: 3, total: 3, complete: false };
const fish = { id: 'fish', title: 'Feed the pond fish', current: 1, total: 1, complete: true };

test('the game shell uses a closed native disclosure and a status region for toasts', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<details id="mission-hud" class="mission-hud">\s*<summary>Missions/);
  assert.match(html, /id="mission-toast"[^>]+role="status"/);
  assert.doesNotMatch(html, /type="checkbox"|[✓✔]/);
});

test('the HUD updates counters, hints and inventory in place with either spoiler state', () => {
  const { hud, elements } = missionHudFixture();
  const details = elements['mission-hud'];
  const list = elements['mission-list'];
  const status = { missions: [apples, fish], hint: 'Place the basket on the cabin table.', inventory: ['Basket'] };
  assert.equal(details.open, false);
  hud.update(status);
  assert.equal(elements['mission-summary'].textContent, '1/2');
  assert.deepEqual(list.children.map(row => row.children.map(child => child.textContent)), [
    ['Collect and deliver apples', '3/3'], ['Feed the pond fish', '1/1'],
  ]);
  assert.deepEqual(list.children.map(row => row.attributes.has('data-complete')), [false, true]);
  assert.equal(elements['mission-hint-text'].textContent, status.hint);
  assert.equal(elements['mission-inventory-text'].textContent, 'Basket');

  const rows = list.children.slice();
  details.open = true;
  hud.update({ ...status, missions: [{ ...apples, complete: true }, fish], hint: '', inventory: [] });
  assert.equal(details.open, true, 'refreshing the same visit after pause preserves the disclosure');
  assert.equal(elements['mission-summary'].textContent, '2/2');
  assert.equal(list.children[0], rows[0]);
  assert.equal(list.children[1], rows[1]);
  assert.equal(elements['mission-hint'].hidden, true);
  assert.equal(elements['mission-inventory'].hidden, true);

  details.open = false;
  hud.update({ missions: [] });
  assert.equal(details.open, false);
  assert.equal(details.hidden, true);
  assert.deepEqual(list.children, []);
  assert.equal(elements['mission-summary'].textContent, '0/0');
  hud.update(status);
  assert.equal(details.hidden, false);
});

test('toasts expire, replace previous feedback and clear on restart or travel', () => {
  const { hud, elements, toast, pending, advance } = missionHudFixture();
  const details = elements['mission-hud'];
  const panel = elements['mission-panel'];
  hud.notify('Three fish caught!');
  advance(2000);
  hud.notify('Three fish caught!');
  assert.equal(pending.size, 1);
  advance(1000);
  assert.equal(toast.textContent, '');
  assert.equal(pending.size, 0);

  details.open = true;
  panel.scrollTop = 30;
  hud.notify('Access card acquired!');
  advance(2000);
  hud.notify('Lighter acquired!');
  advance(1000);
  assert.equal(toast.textContent, 'Lighter acquired!');
  assert.equal(pending.size, 1);
  hud.reset();
  assert.equal(details.open, false);
  assert.equal(panel.scrollTop, 0);
  assert.equal(toast.textContent, '');
  assert.equal(pending.size, 0);

  hud.notify('Frozen Key collected!', { duration: 10 });
  advance(10);
  assert.equal(toast.textContent, '');
});
