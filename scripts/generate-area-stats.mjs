import { lstat, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, posix, resolve } from 'node:path';

const identifier = /^[A-Za-z_$][\w$]*$/;
const decimal = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const areaRoot = 'areas/';
const jsFile = /\.[cm]?js$/i;
const imageFormats = new Map([
  ['jpg', 'JPG'], ['jpeg', 'JPG'], ['png', 'PNG'], ['webp', 'WebP'],
  ['gif', 'GIF'], ['avif', 'AVIF'], ['svg', 'SVG'], ['bmp', 'BMP'], ['ico', 'ICO'],
  ['tif', 'TIFF'], ['tiff', 'TIFF'], ['apng', 'APNG'], ['jxl', 'JPEG XL'],
  ['heif', 'HEIF'], ['heic', 'HEIC'],
]);

// Group delimiters so only top-level declarations and object properties are read.
function tokenize(source, file) {
  const token = /\s+|\/\/[^\r\n\u2028\u2029]*|\/\*[\s\S]*?\*\/|'(?:\\[\s\S]|[^'\\\r\n])*'|"(?:\\[\s\S]|[^"\\\r\n])*"|[A-Za-z_$][\w$]*|(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|\.\.\.|=>|[^]/y;
  const regexp = /\/(?:\\[^\r\n]|\[(?:\\[^\r\n]|[^\]\\\r\n])*\]|[^/\\[\r\n])+\/[A-Za-z]*/y;
  const template = /(?:\\[\s\S]|[^$`\\]|\$(?!\{))*(`|\$\{)/y;
  const closing = { '{': '}', '[': ']', '(': ')' };
  let offset = 0;

  function group(end) {
    const items = [];
    while (offset < source.length) {
      token.lastIndex = offset;
      const [part] = token.exec(source);
      offset = token.lastIndex;
      if (/^(?:\s|\/\/|\/\*)/.test(part)) continue;
      if (part === end) return items;
      if (Object.hasOwn(closing, part)) {
        items.push({ open: part, items: group(closing[part]) });
      } else if (part === '`') {
        do {
          template.lastIndex = offset;
          const chunk = template.exec(source);
          if (!chunk) throw new Error(`Unclosed template in ${file}`);
          offset = template.lastIndex;
          if (chunk[1] === '`') break;
          group('}');
        } while (true);
        items.push('`');
      } else if (part === '/' && (!items.length || /^(?:[=,;:?!&|+*%~^<>-]|=>|return|throw|case)$/.test(items.at(-1)))) {
        regexp.lastIndex = offset - 1;
        if (!regexp.exec(source)) throw new Error(`Unsupported regular expression in ${file}`);
        offset = regexp.lastIndex;
        items.push('/regexp/');
      } else if (/^[})\]'"]$/.test(part)) {
        throw new Error(`Unexpected ${part} while parsing ${file}`);
      } else {
        items.push(part);
      }
    }
    if (end) throw new Error(`Expected ${end} while parsing ${file}`);
    return items;
  }

  return group();
}

function split(items, separator) {
  const parts = [];
  let start = 0;
  for (const [index, item] of items.entries()) {
    if (item !== separator) continue;
    parts.push(items.slice(start, index));
    start = index + 1;
  }
  if (start < items.length) parts.push(items.slice(start));
  return parts;
}

function stringLiteral(token) {
  if (typeof token !== 'string' || !/^['"]/.test(token)) return null;
  const content = token.slice(1, -1);
  // Support quoted names and paths with escaped quotes or backslashes.
  if (/\\(?!['"\\])/.test(content.replaceAll('\\\\', ''))) return null;
  return content.replace(/\\(['"\\])/g, '$1');
}

function propertyName(token) {
  return typeof token === 'string' && identifier.test(token) ? token : stringLiteral(token);
}

function fields(object, file) {
  if (object?.open !== '{') throw new Error(`Expected a static object in ${file}`);
  const properties = new Map();
  for (const [key, separator, ...value] of split(object.items, ',')) {
    const method = ['get', 'set', 'async'].includes(key) && value[0]?.open === '(';
    const name = propertyName(method ? separator : key);
    if (name === null || name === '__proto__') throw new Error(`Unsupported object property in ${file}`);
    if (!method && separator !== undefined && separator !== ':' && separator?.open !== '(') {
      throw new Error(`Unsupported object property "${name}" in ${file}`);
    }
    properties.set(name, separator === ':' ? value : []);
  }
  return properties;
}

function moduleBindings(tokens) {
  const constants = new Map();
  const imports = new Map();
  for (let index = 0; index < tokens.length; index++) {
    if (tokens[index] === 'import' && tokens[index + 1]?.open === '{' && tokens[index + 2] === 'from') {
      const specifier = stringLiteral(tokens[index + 3]);
      for (const [name, as, local] of split(tokens[index + 1].items, ',')) {
        imports.set(as === 'as' ? local : name, { name, specifier });
      }
    }
    if (tokens[index] === 'const' && tokens[index + 2] === '=') {
      const end = tokens.indexOf(';', index + 3);
      if (end < 0) continue;
      for (const [name, equals, ...value] of split(tokens.slice(index + 1, end), ',')) {
        if (equals === '=') constants.set(name, { value, exported: tokens[index - 1] === 'export' });
      }
      index = end;
    }
  }
  return { constants, imports };
}

function definition(bindings, name, file) {
  const declaration = bindings.constants.get(name);
  if (declaration?.exported && declaration.value.length === 1) return declaration.value[0];
  throw new Error(`Expected export const ${name} with a static value in ${file}`);
}

function publicVisibility(tokens, file) {
  const index = tokens.findIndex((token, index) => token === 'function' && tokens[index + 1] === 'publicArea');
  const parameters = tokens[index + 2]?.items;
  const body = tokens[index + 3]?.items;
  const items = body?.[1]?.items;
  if (index >= 0 && parameters && body?.length === 3 && body[0] === 'return' && body[2] === ';' &&
      body[1].open === '{' && items[0] === '...' && items[1] === parameters[0] && items[2] === ',') {
    const properties = fields({ open: '{', items: items.slice(3) }, file);
    const visibility = properties.get('show');
    if (visibility?.length === 1 && visibility[0] === 'true' &&
        !['title', 'width', 'depth'].some(field => properties.has(field))) return 'Public';
  }
  throw new Error(`Could not verify publicArea visibility in ${file}`);
}

function registryEntry(id, value, tokens) {
  if (value?.length === 2 && value[0] === 'publicArea' && value[1]?.open === '(') {
    const [name, path, loader, ...rest] = split(value[1].items, ',');
    const folder = stringLiteral(path?.[0]);
    if (name?.length && path?.length === 1 && folder && /^[\w-]+$/.test(folder) && !rest.length) {
      return {
        name, folder: areaRoot + folder, visibility: publicVisibility(tokens, 'game.js'),
        entryPath: loader && modulePath(loader, id),
      };
    }
  }
  const items = value?.[0]?.items;
  const comma = items?.indexOf(',');
  if (value?.length === 1 && value[0]?.open === '{' && items[0] === '...' && comma > 1) {
    const properties = fields({ open: '{', items: items.slice(comma + 1) }, `game.js (${id})`);
    const visibility = properties.get('show');
    if (visibility?.length === 1 && ['true', 'false'].includes(visibility[0])) {
      return {
        name: items.slice(1, comma), visibility: visibility[0] === 'true' ? 'Public' : 'Hidden', properties,
        entryPath: properties.has('loadModule') ? modulePath(properties.get('loadModule'), id) : undefined,
      };
    }
  }
  throw new Error(`Unsupported area registration for "${id}" in game.js`);
}

function modulePath(loader, id) {
  const [parameters, arrow, keyword, args, ...rest] = loader;
  if (parameters?.open === '(' && parameters.items.length === 0 && arrow === '=>' &&
      keyword === 'import' && args?.open === '(' && args.items.length === 1 && !rest.length) {
    const path = localFile('game.js', stringLiteral(args.items[0]));
    if (path) return path;
  }
  throw new Error(`Expected a literal area module loader for "${id}" in game.js`);
}

function localFile(from, specifier) {
  if (!specifier?.startsWith('.')) return null;
  const path = posix.normalize(posix.join(posix.dirname(from), specifier));
  return path.startsWith(areaRoot) && jsFile.test(path) ? path : null;
}

async function resolveValue(expression, file, readModule, seen = new Set()) {
  if (expression?.length !== 1 || typeof expression[0] !== 'string') return null;
  const [value] = expression;
  if (decimal.test(value)) return Number(value);
  if (!identifier.test(value)) return stringLiteral(value);
  const key = `${file}:${value}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const { constants, imports } = (await readModule(file)).bindings;
  if (constants.has(value)) return resolveValue(constants.get(value).value, file, readModule, seen);
  const imported = imports.get(value);
  const importedFile = localFile(file, imported?.specifier);
  if (!importedFile) return null;
  const declaration = (await readModule(importedFile)).bindings.constants.get(imported.name);
  if (!declaration?.exported) return null;
  return resolveValue(declaration.value, importedFile, readModule, seen);
}

async function folderFiles(root, directory) {
  const info = await lstat(join(root, directory)).catch(error => {
    if (error.code !== 'ENOENT') throw error;
  });
  if (!info?.isDirectory()) return [];
  const children = await readdir(join(root, directory), { withFileTypes: true });
  const paths = await Promise.all(children.map(child => {
    const path = posix.join(directory, child.name);
    if (child.isDirectory()) return folderFiles(root, path);
    return child.isFile() ? [path] : [];
  }));
  return paths.flat();
}

async function fileStats(root, paths) {
  const stats = { folderBytes: 0, totalFiles: paths.size, jsFiles: 0, jsBytes: 0, imageFiles: 0, imageBytes: 0 };
  const formats = new Set();
  for (const path of paths) {
    const file = join(root, path);
    const { size } = await lstat(file);
    stats.folderBytes += size;
    if (jsFile.test(path)) {
      stats.jsFiles++;
      stats.jsBytes += size;
    }
    const format = imageFormats.get(extname(path).slice(1).toLowerCase());
    if (format) {
      stats.imageFiles++;
      stats.imageBytes += size;
      formats.add(format);
    }
  }
  return { ...stats, imageFormats: [...formats].sort() };
}

export async function readAreaSources(root) {
  const modules = new Map();
  async function readModule(file) {
    if (!modules.has(file)) {
      const path = join(root, file);
      if (!(await lstat(path)).isFile()) throw new Error(`Expected a regular file: ${file}`);
      const tokens = tokenize(await readFile(path, 'utf8'), file);
      modules.set(file, { tokens, bindings: moduleBindings(tokens) });
    }
    return modules.get(file);
  }

  const { tokens, bindings } = await readModule('game.js');
  const registry = fields(definition(bindings, 'areas', 'game.js'), 'game.js');
  const areas = [];
  for (const id of [...registry.keys()].sort()) {
    const { name, folder, visibility, properties, entryPath } = registryEntry(id, registry.get(id), tokens);
    const imported = bindings.imports.get(name[0]);
    const catalogKey = name[1]?.open === '[' && name[1].items.length === 1 && stringLiteral(name[1].items[0]);
    const fromCatalog = imported?.specifier === './area-catalog.js' && imported.name === 'areaMetadata';
    const metadataPath = fromCatalog && entryPath && name.length === 2 && catalogKey === id
      ? posix.join(posix.dirname(entryPath), 'metadata.js')
      : name.length === 1 && localFile('game.js', imported?.specifier);
    if (!metadataPath) throw new Error(`Expected an area import for "${id}" in game.js`);
    const entry = entryPath ?? metadataPath;
    const exportName = fromCatalog ? 'metadata' : imported.name;
    const metadata = fields(definition((await readModule(metadataPath)).bindings, exportName, metadataPath), metadataPath);
    const [title, rawWidth, rawDepth] = await Promise.all(
      ['title', 'width', 'depth'].map(field => properties?.has(field)
        ? resolveValue(properties.get(field), 'game.js', readModule)
        : resolveValue(metadata.get(field), metadataPath, readModule)),
    );
    if (typeof title !== 'string' || !title.trim()) throw new Error(`Could not read the area title in ${metadataPath}`);
    const width = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : null;
    const depth = Number.isFinite(rawDepth) && rawDepth > 0 ? rawDepth : null;
    const mapArea = width !== null && depth !== null && Number.isFinite(width * depth) ? width * depth : null;
    const directory = folder ?? (posix.dirname(entry) === 'areas' ? entry.slice(0, -extname(entry).length) : posix.dirname(entry));
    const thumbnail = folder ? './' + posix.join(folder, posix.basename(folder) + '.jpg') : null;
    areas.push({ id, name: title, visibility, thumbnail, width, depth, mapArea, entry, directory, metadataPath });
  }
  return areas;
}

export async function generateAreaStats(root) {
  const areas = [];
  for (const { entry, directory, metadataPath, ...area } of await readAreaSources(root)) {
    const paths = new Set([entry, metadataPath, ...await folderFiles(root, directory)]);
    areas.push({ ...area, ...await fileStats(root, paths) });
  }
  const summary = {
    totalAreas: areas.length, publicAreas: 0, hiddenAreas: 0, totalFiles: 0,
    totalBytes: 0,
  };
  for (const area of areas) {
    if (area.visibility === 'Public') summary.publicAreas++;
    else summary.hiddenAreas++;
    summary.totalFiles += area.totalFiles;
    summary.totalBytes += area.folderBytes;
  }
  return { summary, areas };
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) {
  const target = new URL('../area-stats.json', import.meta.url);
  const stats = await generateAreaStats(dirname(dirname(import.meta.filename)));
  const content = JSON.stringify(stats, null, 2) + '\n';
  if (process.argv.includes('--check')) {
    if (await readFile(target, 'utf8') !== content) {
      throw new Error('area-stats.json is out of date. Run node scripts/generate-area-stats.mjs');
    }
  } else {
    await writeFile(target, content);
  }
  console.log(`Area statistics for ${stats.areas.length} Kids World areas`);
}
