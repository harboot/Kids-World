const windowMs = 5_000;
const refreshMs = 1_000;

export function isFpsView(url) {
  return url.searchParams.get('view') === 'fps';
}

export function createFrameMeter(label) {
  const samples = [];
  let active = false;
  let previous = null;
  let refreshAt = 0;

  return {
    setActive(enabled) {
      if (enabled === active) return;
      active = enabled;
      label.hidden = !active;
      samples.length = 0;
      previous = null;
      if (active) label.textContent = 'P95 …';
    },
    sample(stamp) {
      if (!active) return;
      if (previous === null) {
        previous = stamp;
        refreshAt = stamp + refreshMs;
        return;
      }
      if (stamp <= previous) return;
      samples.push({ stamp, duration: stamp - previous });
      previous = stamp;
      if (stamp < refreshAt) return;

      const first = samples.findIndex(sample => sample.stamp > stamp - windowMs);
      samples.splice(0, first);
      const durations = samples.map(sample => sample.duration).sort((a, b) => a - b);
      const p95 = durations[Math.ceil(.95 * durations.length) - 1];
      label.textContent = `P95 ${p95.toFixed(1)} ms · ~${(1_000 / p95).toFixed(1)} FPS`;
      refreshAt = stamp + refreshMs;
    },
  };
}
