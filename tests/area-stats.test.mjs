import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { areas as registry } from '../game.js';
import { generateAreaStats } from '../scripts/generate-area-stats.mjs';

const root = new URL('../', import.meta.url);

async function fixture(t, files) {
  const directory = await mkdtemp(join(tmpdir(), 'kids-world-area-stats-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(async ([name, contents]) => {
    const file = join(directory, name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, contents);
  }));
  return directory;
}

test('reads public and hidden definitions, owns only area files, and counts physical bytes and lines', async t => {
  const snow = [
    "import { DEPTH as SIZE } from './winter-yard/layout.js';",
    "import '../../irrelevant-runtime.js';",
    "throw new Error('Modules must never run');",
    'const WIDTH = 12.5;',
    'export const snow = {',
    "  title: \"Snow's Basin\",",
    '  width: WIDTH, depth: SIZE,',
    '  load() { return { width: 999, depth: 888 }; },',
    '};',
  ].join('\n') + '\n';
  const layout = 'export const DEPTH = 24;\r\n\r\n// Last line without a newline';
  const secret = [
    '/* export const secret = { title: "Decoy", width: 999 }; */',
    'const token = /[{}]/;',
    'const message = `ignore ${`nested ${token}`}`;',
    'export const secret = { title: "Secret Area", width: 7, get width() { return 99; }, depth: 4 };',
  ].join('\n');
  const directory = await fixture(t, {
    'game.js': [
      "import { snow as winter } from './areas/winter-yard.js';",
      "import { secret } from './areas/secret/index.js';",
      'function publicArea(area, folder) { return { ...area, show: true, thumbnail: folder }; }',
      'export const areas = {',
      "  snow: publicArea(winter, 'winter-yard'),",
      "  'secret-area': { ...secret, show: false },",
      '};',
    ].join('\n'),
    'areas/winter-yard.js': snow,
    'areas/winter-yard/layout.js': layout,
    'areas/winter-yard/empty.mjs': '',
    'areas/winter-yard/pics/one.JPEG': Buffer.alloc(13),
    'areas/winter-yard/pics/two.jpg': Buffer.alloc(21),
    'areas/winter-yard/pics/three.PNG': Buffer.alloc(34),
    'areas/winter-yard/pics/four.webp': Buffer.alloc(7),
    'areas/winter-yard/pics/notes.txt': 'area notes',
    'areas/secret/index.js': secret,
    'areas/shared/shared.js': 'excluded',
    'areas/unregistered.js': 'excluded',
    'core/engine.js': 'excluded',
    'vendor/three.js': 'excluded',
    'assets/global.png': Buffer.alloc(1024),
  });

  const stats = await generateAreaStats(directory);
  const winterBytes = Buffer.byteLength(snow + layout);
  const winterFolder = winterBytes + 75 + Buffer.byteLength('area notes');
  const secretBytes = Buffer.byteLength(secret);
  assert.deepEqual(stats.areas, [{
    id: 'secret-area', name: 'Secret Area', visibility: 'Hidden', thumbnail: null, width: null, depth: 4, mapArea: null,
    folderBytes: secretBytes, totalFiles: 1, jsFiles: 1, jsBytes: secretBytes, jsLines: 4,
    imageFiles: 0, imageBytes: 0, imageFormats: [],
  }, {
    id: 'snow', name: "Snow's Basin", visibility: 'Public', thumbnail: './areas/winter-yard/winter-yard.jpg', width: 12.5, depth: 24, mapArea: 300,
    folderBytes: winterFolder, totalFiles: 8, jsFiles: 3, jsBytes: winterBytes, jsLines: 12,
    imageFiles: 4, imageBytes: 75, imageFormats: ['JPG', 'PNG', 'WebP'],
  }]);
  assert.deepEqual(stats.summary, {
    totalAreas: 2, publicAreas: 1, hiddenAreas: 1, totalFiles: 9,
    totalBytes: winterFolder + secretBytes, totalJsLines: 16,
    largestMap: { name: "Snow's Basin", mapArea: 300 },
    largestFolder: { name: "Snow's Basin", folderBytes: winterFolder },
  });
  assert.equal(JSON.stringify(stats), JSON.stringify(await generateAreaStats(directory)));
});

test('emits the same JSON bytes each time and rejects stale data in check mode', async t => {
  const script = 'scripts/generate-area-stats.mjs';
  const directory = await fixture(t, {
    [script]: await readFile(new URL(script, root)),
    'game.js': "import { metadata } from './areas/example/metadata.js';\n" +
      "export const areas = { example: { ...metadata, show: false, loadModule: () => import('./areas/example/index.js') } };\n",
    'areas/example/metadata.js': 'export const metadata = { title: "Example", width: 9, depth: 3 };\n',
    'areas/example/index.js': 'throw new Error("Area implementations must not run");\n',
    'area-stats.json': '{}\n',
  });
  function generate(...args) {
    return execFileSync(process.execPath, [script, ...args], { cwd: directory, stdio: 'pipe' });
  }
  assert.throws(() => generate('--check'), /area-stats\.json is out of date/);
  generate();
  const first = await readFile(join(directory, 'area-stats.json'), 'utf8');
  assert.equal(JSON.parse(first).areas[0].mapArea, 27);
  assert.equal(JSON.parse(first).areas[0].totalFiles, 2);
  generate();
  assert.equal(await readFile(join(directory, 'area-stats.json'), 'utf8'), first);
  assert.doesNotThrow(() => generate('--check'));
});

class Element extends EventTarget {
  children = [];
  attributes = new Map();
  classList = { add() {} };
  value = '';
  disabled = true;
  hidden = true;
  textContent = '';

  append(...children) { this.children.push(...children); }
  insertCell() {
    const cell = new Element();
    this.append(cell);
    return cell;
  }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  querySelector() { return this.children[0]; }
}

test('the dashboard renders the remaining columns, registered thumbnails, and hidden area links', async () => {
  const html = await readFile(new URL('stats.html', root), 'utf8');
  const json = await readFile(new URL('area-stats.json', root), 'utf8');
  const { areas, summary } = JSON.parse(json);
  const manifest = JSON.parse(await readFile(new URL('version.json', root), 'utf8'));
  const precachedPaths = new Set(manifest.files.map(file => file.path));
  const page = new URL('https://example.test/Kids-World/stats.html');
  const script = html.match(/<script type="module">([\s\S]+)<\/script>/)[1];
  const dataPath = html.match(/data-stats-url="([^"]+)"/)[1];
  const buttons = [...html.matchAll(/data-sort="([^"]+)"/g)].map(([, property]) => {
    const button = new Element();
    button.dataset = { sort: property };
    button.parentElement = new Element();
    button.append(new Element());
    return button;
  });
  assert.deepEqual(buttons.map(button => button.dataset.sort), [
    'name', 'visibility', 'dimensions', 'mapArea', 'jsFiles', 'jsBytes', 'jsLines', 'imageBytes',
  ]);
  const selectors = Object.fromEntries(['tbody', '.summary', '.table-scroll'].map(name => [name, new Element()]));
  const ids = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Element()]));
  const requests = [];
  await runInNewContext(`(async () => {${script}\n})()`, {
    console,
    URL,
    document: {
      baseURI: page.href,
      documentElement: { dataset: { statsUrl: dataPath } },
      createElement: tagName => Object.assign(new Element(), { tagName }),
      getElementById: id => ids[id],
      querySelector: selector => selectors[selector],
      querySelectorAll: () => buttons,
    },
    fetch(path) {
      requests.push(path);
      return Promise.resolve(new Response(json));
    },
  });
  assert.deepEqual(requests, ['./area-stats.json']);
  assert.equal(ids['total-areas'].textContent, String(areas.length));
  assert.equal(ids['visibility-counts'].textContent, `${summary.publicAreas} / ${summary.hiddenAreas}`);
  assert.match(ids['total-size'].textContent, /^[\d,.]+ [KM]B$/);
  assert.equal(selectors['.summary'].hidden, false);
  assert.equal(selectors['.table-scroll'].hidden, false);
  const rows = () => selectors.tbody.children;
  const linkFor = row => row.children[0].children[0];
  const titleFor = row => linkFor(row).children[1].textContent;
  assert.equal(rows().length, areas.length);
  for (const area of areas) {
    const row = rows().find(row => linkFor(row).href === `./?area=${encodeURIComponent(area.id)}`);
    assert.ok(row, area.id);
    assert.equal(titleFor(row), area.name);
    const [thumbnail] = linkFor(row).children;
    const registeredThumbnail = registry[area.id].thumbnail;
    if (registeredThumbnail) {
      assert.equal(new URL(area.thumbnail, root).href, registeredThumbnail);
      assert.ok(precachedPaths.has(area.thumbnail));
      assert.equal(thumbnail.tagName, 'img');
      assert.equal(thumbnail.src, new URL(area.thumbnail, page).href);
      assert.equal(thumbnail.alt, '');
      assert.equal(thumbnail.width, 64);
      assert.equal(thumbnail.height, 36);
    } else {
      assert.equal(area.thumbnail, null);
      assert.equal(thumbnail.tagName, 'span');
      assert.equal(thumbnail.src, undefined);
      assert.equal(thumbnail.attributes.get('aria-hidden'), 'true');
    }
    assert.equal(row.children[1].children[0].textContent, area.visibility);
    assert.equal(row.children.length, buttons.length);
    assert.ok(row.children.slice(2).every(cell => cell.textContent && !/NaN|undefined/.test(cell.textContent)));
  }

  ids.filter.value = 'Hidden';
  ids.filter.dispatchEvent(new Event('change'));
  assert.equal(rows().length, summary.hiddenAreas);
  ids.search.value = 'missing area name';
  ids.search.dispatchEvent(new Event('input'));
  assert.equal(rows().length, 0);
  assert.match(ids.status.textContent, /No areas match/);

  ids.search.value = '';
  ids.filter.value = '';
  const mapSort = buttons.find(button => button.dataset.sort === 'mapArea');
  mapSort.dispatchEvent(new Event('click'));
  mapSort.dispatchEvent(new Event('click'));
  assert.equal(mapSort.parentElement.attributes.get('aria-sort'), 'descending');
  assert.equal(titleFor(rows()[0]), summary.largestMap.name);
});
