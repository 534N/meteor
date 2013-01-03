var path = require('path');
var assert = require('assert');
var fs = require('fs');
var files = require(path.join(__dirname, '..', 'files.js'));
var bundler = require(path.join(__dirname, '..', 'bundler.js'));
var inFiber = require(path.join(__dirname, '..', 'fiber-helpers.js')).inFiber;

///
/// SETUP
///

// print stack track and exit with error code if an assertion fails
process.on('uncaughtException', function (err) {
  console.log(err.stack);
  process.exit(1);
});

///
/// UTILITIES
///

var tmpDir = function () {
  return files.mkdtemp('test_bundler');
};

///
/// TEST APPS
///

// an empty app with a .meteor/version file whose contents are "0.1"
var versionedAppDir = path.join(__dirname, 'empty-versioned-app');
// an empty app with no .meteor/version file
var unversionedAppDir = path.join(__dirname, 'empty-unversioned-app');

///
/// TESTS
///

// versioned app, nodeModules: 'skip'
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(versionedAppDir, tmpOutputDir, {nodeModulesMode: 'skip'});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
  // no node_modules directory
  assert(!fs.existsSync(path.join(tmpOutputDir, "server", "node_modules")));
  // verify that contents are minified
  var appHtml = fs.readFileSync(path.join(tmpOutputDir, "app.html"));
  assert(/src=\"\/[0-9a-f]{40,40}.js\"/.test(appHtml));
  assert(!(/src=\"\/packages/.test(appHtml)));
}));

// versioned app, nodeModules: 'skip', noMinify
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(versionedAppDir, tmpOutputDir, {nodeModulesMode: 'skip', noMinify: true});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
  // verify that contents are not minified
  var appHtml = fs.readFileSync(path.join(tmpOutputDir, "app.html"));
  assert(!(/src=\"\/[0-9a-f]{40,40}.js\"/.test(appHtml)));
  assert(/src=\"\/packages\/meteor/.test(appHtml));
  assert(/src=\"\/packages\/deps/.test(appHtml));
  // verify that tests aren't included
  assert(!(/src=\"\/packages\/meteor\/url_tests.js/.test(appHtml)));
}));

// versioned app, nodeModules: 'skip', noMinify, testPackages: ['meteor']
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(
    versionedAppDir, tmpOutputDir, {nodeModulesMode: 'skip', noMinify: true, testPackages: ['meteor']});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
  // verify that tests for the meteor package are included
  var appHtml = fs.readFileSync(path.join(tmpOutputDir, "app.html"));
  assert(/src=\"\/packages\/meteor\/url_tests.js/.test(appHtml));
}));

// versioned app, nodeModules: 'copy'
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(versionedAppDir, tmpOutputDir, {nodeModulesMode: 'copy'});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
  // node_modules directory exists and is not a symlink
  assert(!fs.lstatSync(path.join(tmpOutputDir, "server", "node_modules")).isSymbolicLink());
  // node_modules contains fibers
  assert(fs.existsSync(path.join(tmpOutputDir, "server", "node_modules", "fibers")));
}));

// versioned app, nodeModules: 'symlink'
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(versionedAppDir, tmpOutputDir, {nodeModulesMode: 'symlink'});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
  // node_modules directory exists and is not a symlink
  assert(fs.lstatSync(path.join(tmpOutputDir, "server", "node_modules")).isSymbolicLink());
  // node_modules contains fibers
  assert(fs.existsSync(path.join(tmpOutputDir, "server", "node_modules", "fibers")));
}));

// unversioned app, no options
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(unversionedAppDir, tmpOutputDir, {nodeModulesMode: 'skip'});
  assert.notEqual(errors.length, 0);
  assert.notEqual(errors[0].indexOf('Exception while bundling'), -1);
  assert.notEqual(errors[0].indexOf('Package not found: meteor'), -1);
}));

// unversioned app, using `versionOverride`
assert.doesNotThrow(inFiber(function () {
  var tmpOutputDir = tmpDir();
  var errors = bundler.bundle(unversionedAppDir, tmpOutputDir, {versionOverride: '0.1', nodeModulesMode: 'skip'});
  assert.strictEqual(errors, undefined);

  // sanity check -- main.js has expected contents.
  assert.strictEqual(fs.readFileSync(path.join(tmpOutputDir, "main.js"), "utf8").trim(),
                     "require(require('path').join(__dirname, 'server', 'server.js'));");
}));
