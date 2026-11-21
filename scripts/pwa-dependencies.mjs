import { parse } from 'acorn';
import { posix } from 'node:path';

function parseModule(source, path) {
  try {
    return parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (error) {
    throw new Error(`Could not parse release module ${path}: ${error.message}`);
  }
}

export function staticMetadata(source, path) {
  const constants = new Map();
  let metadata;
  const unsupported = () => { throw new Error(`Expected static metadata in ${path}`); };

  function value(node) {
    if (node?.type === 'Literal' && (node.value === null || ['string', 'number', 'boolean'].includes(typeof node.value))) {
      return node.value;
    }
    if (node?.type === 'Identifier' && constants.has(node.name)) return constants.get(node.name);
    if (node?.type === 'ArrayExpression') return node.elements.map(value);
    if (node?.type === 'ObjectExpression') {
      return Object.fromEntries(node.properties.map(property => {
        const key = property.key?.name ?? property.key?.value;
        if (property.kind !== 'init' || property.computed || property.method || typeof key !== 'string' ||
            key === '__proto__') unsupported();
        return [key, value(property.value)];
      }));
    }
    if (node?.type === 'UnaryExpression' && node.operator === '-') {
      const operand = value(node.argument);
      if (typeof operand === 'number') return -operand;
    }
    if (node?.type === 'BinaryExpression' && node.operator === '+') {
      const left = value(node.left);
      const right = value(node.right);
      if (typeof left === 'number' && typeof right === 'number') return left + right;
    }
    return unsupported();
  }

  for (const statement of parseModule(source, path).body) {
    const declaration = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (declaration?.type !== 'VariableDeclaration' || declaration.kind !== 'const') unsupported();
    for (const { id, init } of declaration.declarations) {
      if (id.type !== 'Identifier') unsupported();
      const result = value(init);
      constants.set(id.name, result);
      if (id.name === 'metadata' && statement.type === 'ExportNamedDeclaration') metadata = result;
    }
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) unsupported();
  return metadata;
}

function visit(node, callback) {
  if (!node?.type) return;
  callback(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => visit(child, callback));
    else visit(value, callback);
  }
}

const literal = node => node?.type === 'Literal' && typeof node.value === 'string' ? node.value : null;
const nameOf = node => node?.type === 'Identifier' ? node.name : literal(node);
const isURL = node => node?.type === 'NewExpression' && node.callee.name === 'URL';
const isModuleURL = node => node?.type === 'MemberExpression' && !node.computed && node.property.name === 'url' &&
  node.object.type === 'MetaProperty' && node.object.meta.name === 'import' && node.object.property.name === 'meta';

function hiddenLoaders(tree, areas) {
  const registrations = tree.body
    .filter(node => node.type === 'ExportNamedDeclaration')
    .flatMap(node => node.declaration?.declarations ?? [])
    .find(node => node.id.name === 'areas')?.init;
  const deferred = new Set();
  for (const { id, entry, visibility } of areas) {
    if (visibility !== 'Hidden') continue;
    const registration = registrations?.properties?.find(property => nameOf(property.key) === id);
    const loader = registration?.value.properties?.find(property => nameOf(property.key) === 'loadModule')?.value;
    if (loader?.body.type !== 'ImportExpression' || literal(loader.body.source) !== './' + entry) {
      throw new Error(`Could not verify the on-demand loader for ${id}`);
    }
    deferred.add(loader.body);
  }
  return deferred;
}

export function moduleDependencies(source, path, areas) {
  const tree = parseModule(source, path);
  const deferred = path === 'game.js' ? hiddenLoaders(tree, areas) : new Set();
  const dependencies = [];
  const unresolved = () => { throw new Error(`Cannot verify release dependency in ${path}`); };

  function add(specifier) {
    if (!specifier || !/^\.{1,2}\/[a-zA-Z0-9_./-]+$/.test(specifier)) unresolved();
    dependencies.push(posix.normalize(posix.join(posix.dirname(path), specifier)));
  }

  visit(tree, node => {
    if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) {
      add(literal(node.source));
    }
    if (node.type === 'ImportExpression' && !deferred.has(node)) {
      // Bootstrap chooses the verified base at runtime. The entry itself is fixed.
      if (path === 'pwa/bootstrap.js' && isURL(node.source) && literal(node.source.arguments[0]) === 'game.js' &&
          node.source.arguments[1]?.name === 'base') dependencies.push('game.js');
      else add(literal(node.source));
    }
    if (isURL(node) && isModuleURL(node.arguments[1])) {
      const reference = node.arguments[0];
      // The registry helper supplies the registered public folder in this exact thumbnail pattern.
      if (path === 'game.js' && reference?.type === 'TemplateLiteral' &&
          reference.quasis.map(part => part.value.cooked).join('|') === './areas/|/|.jpg' &&
          reference.expressions.every(expression => expression.name === 'folder')) return;
      add(literal(reference));
    }
    if (path.startsWith('areas/')) {
      // Area asset requests must be anchored to the module so the worker sees the pinned release URL.
      if (isURL(node) && !isModuleURL(node.arguments[1])) unresolved();
      const called = nameOf(node.callee?.property ?? node.callee);
      if ((node.type === 'CallExpression' && ['fetch', 'importScripts', 'sendBeacon'].includes(called)) ||
          (node.type === 'NewExpression' && ['Worker', 'SharedWorker', 'Audio', 'XMLHttpRequest'].includes(called))) {
        const resource = node.arguments[0];
        if (!(isURL(resource) && isModuleURL(resource.arguments[1]) && node.arguments.length > 0)) unresolved();
      }
      if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' &&
          ['src', 'srcset'].includes(nameOf(node.left.property)) &&
          !(isURL(node.right) && isModuleURL(node.right.arguments[1]))) unresolved();
    }
  });
  return dependencies;
}
