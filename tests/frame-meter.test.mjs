import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFrameMeter, isFpsView } from '../core/frame-meter.js';

test('the frame meter opts in with view=fps', () => {
  const url = new URL('https://example.test/?area=princess-gallery');
  assert.equal(isFpsView(url), false);
  url.searchParams.set('view', 'drone');
  assert.equal(isFpsView(url), false);
  url.searchParams.set('view', 'fps');
  assert.equal(isFpsView(url), true);
});

test('the frame meter reports P95 on a rolling five-second window', () => {
  const label = { hidden: true };
  const meter = createFrameMeter(label);
  meter.setActive(true);
  for (let stamp = 0; stamp < 1_000; stamp += 100) meter.sample(stamp);
  assert.equal(label.textContent, 'P95 …');
  for (let stamp = 1_000; stamp <= 5_000; stamp += 100) meter.sample(stamp);
  assert.equal(label.textContent, 'P95 100.0 ms · ~10.0 FPS');
  for (let stamp = 5_050; stamp <= 10_000; stamp += 50) meter.sample(stamp);
  assert.equal(label.textContent, 'P95 50.0 ms · ~20.0 FPS');
});

test('stopping the frame meter discards earlier frames and skips the pause interval', () => {
  const label = { hidden: true };
  const meter = createFrameMeter(label);
  meter.sample(0);
  assert.equal(label.hidden, true);
  meter.setActive(true);
  meter.sample(100);
  meter.setActive(false);
  meter.sample(12_000);
  assert.equal(label.hidden, true);
  meter.setActive(true);
  assert.equal(label.hidden, false);
  for (let stamp = 13_000; stamp <= 13_760; stamp += 40) meter.sample(stamp);
  meter.sample(14_010);
  assert.equal(label.textContent, 'P95 40.0 ms · ~25.0 FPS');
});
