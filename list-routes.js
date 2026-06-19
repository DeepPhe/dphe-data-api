// Lists every route registered on the Express app with its absolute path.
//
// Express 5 removed `app._router` and the regexp-based layer internals that the
// previous version parsed; layers no longer expose their mount path. Rather than
// read Express's version-specific internals, capture routes as they are
// registered by wrapping the `express()`/`express.Router()` factories, then
// rebuild absolute paths from the recorded mount tree.

const realExpress = require('express');

const METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
const routes = []; // { owner, method, path }
const mounts = []; // { parent, prefix, child }

function instrument(target) {
  if (target.__listRoutesInstrumented) {
    return target;
  }
  target.__listRoutesInstrumented = true;

  for (const method of METHODS) {
    const original = target[method];
    if (typeof original !== 'function') {
      continue;
    }
    target[method] = function (path, ...handlers) {
      // Skip setting getters like app.get('env') that pass no handler.
      if (typeof path === 'string' && handlers.length > 0) {
        routes.push({ owner: target, method: method.toUpperCase(), path });
      }
      return original.call(this, path, ...handlers);
    };
  }

  const originalUse = target.use;
  target.use = function (path, ...handlers) {
    if (typeof path === 'string') {
      for (const handler of handlers.flat()) {
        if (typeof handler === 'function' && handler.__listRoutesInstrumented) {
          mounts.push({ parent: target, prefix: path, child: handler });
        }
      }
    }
    return originalUse.call(this, path, ...handlers);
  };

  return target;
}

// Wrap the factories so every app and router is instrumented the moment it is
// created, before any routes are registered on it.
function wrappedExpress(...args) {
  return instrument(realExpress(...args));
}
Object.assign(wrappedExpress, realExpress);
wrappedExpress.Router = (...args) => instrument(realExpress.Router(...args));
require.cache[require.resolve('express')].exports = wrappedExpress;

// Loading the app registers all routes through the instrumented methods.
const app = require('./src/app');

function joinPaths(prefix, path) {
  const combined = `${prefix}/${path}`.replace(/\/{2,}/g, '/');
  return combined.length > 1 && combined.endsWith('/') ? combined.slice(0, -1) : combined;
}

const collected = [];
function walk(node, prefix) {
  for (const route of routes) {
    if (route.owner === node) {
      collected.push({ method: route.method, path: joinPaths(prefix, route.path) });
    }
  }
  for (const mount of mounts) {
    if (mount.parent === node) {
      walk(mount.child, joinPaths(prefix, mount.prefix));
    }
  }
}
walk(app, '');

collected.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

console.log('Registered Routes:');
console.log('==================');
for (const { method, path } of collected) {
  console.log(`${method.padEnd(7)} ${path}`);
}
