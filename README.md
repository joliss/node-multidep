# node-multidep

Install and `require` multiple versions of a package via npm, like so:

```js
var broccoli0 = multidepRequire('broccoli', '0.16.3');
var broccoli1 = multidepRequire('broccoli', '1.0.0');
```

This is useful for integration testing. It's perhaps not robust enough for
production code.

## Installation

```bash
npm install --save-dev multidep
```

## Usage

### Specifying which versions to install

Create a JSON spec of packages to be installed, e.g. at `test/multidep.json`:

```json
{
  "path": "test/multidep",
  "versions": {
    "broccoli": ["0.16.3", "1.0.0"]
  }
}
```

Do not use fuzzy versions (`"^0.16.0"`) - this will cause problems.

### Installing the packages from npm

Next, run

```bash
./node_modules/.bin/multidep test/multidep.json
```

In this example, it will create `test/multidep` and install broccoli 0.16.3
and broccoli 1.0.0 somewhere inside the `test/multidep` directory.

To run `multidep` automatically after `npm install`, add it as a "pretest"
hook to your `package.json`:

```json
{
  "scripts": {
    "pretest": "multidep test/multidep.json",
    "test": "..."
  }
}
```

`multidep` will not redownload existing packages. If something went wrong,
delete its directory first: `rm -r test/multidep`

### `multidepRequire`: Requiring specific package versions

You can now require the different versions like so:

```js
var multidepRequire = require('multidep')('test/multidep.json');

var broccoli0 = multidepRequire('broccoli', '0.16.3');
var broccoli1 = multidepRequire('broccoli', '1.0.0');
```

Note that `test/multidep.json` is relative to the current working directory.
This is typically your project root.

### `multidepRequire.forEachVersion`: Iterating over all versions

To iterate over each version, use the `.forEachVersion` helper method.

```js
multidepRequire.forEachVersion('broccoli', function(version, broccoli) {
  // Do stuff with the `broccoli` module
});
```

### Testing against the master branch

Sometimes it's useful to test against your local checkout of a package. To
facility this, there is a special `'master'` version for each package whose
presence is detected automatically, without being specified in
`multidep.json`.

First, symlink your checkout to `<path>/<package>-master`, e.g.

```bash
ln -s ~/src/broccoli test/multidep/broccoli-master
```

Then, try to `require` it. If it's not present (for example on a CI server),
you will get `null`, rather than an exception:

```js
var multidepRequire = require('multidep')('test/multidep.json');

var broccoliMaster = multidepRequire('broccoli', 'master');
if (broccoliMaster !== null) {
  // Do stuff
}
```

The `multidepRequire.forEachVersion` function also includes the `'master'`
version automatically when it's present.
