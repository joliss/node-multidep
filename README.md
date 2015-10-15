# node-multidep

Install multiple versions of a package via npm.

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

To run `multidep` automatically before `npm test`, add it as a "pretest"
command to your `package.json`:

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

### Accessing specific package versions

In your integration test, access the different versions like so:

```js
var multidepPackages = require('multidep')('test/multidep.json')

var broccoli_0_16_3 = multidepPackages['broccoli']['0.16.3']()
var broccoli_1_0_0 = multidepPackages['broccoli']['1.0.0']()
```

Note the trailing `()` - this is needed to `require` the module.

### Iterating over all versions of a package

To iterate over each version, use the `.forEachVersion` helper method.

```js
multidepPackages['broccoli'].forEachVersion(function(version, broccoli) {
  // Do stuff with the `broccoli` module
})
```

### Testing against the master branch

Sometimes it's useful to test against your local checkout of a package. To do
so, symlink it to `<path>/<package-name>-master`, e.g.

```bash
ln -s ~/src/broccoli test/multidep/broccoli-master
```

You do not need to list this "master" version in your `multidep.json`.
`multidep` will detect its presence at runtime.

```js
var multidepPackages = require('multidep')('test/multidep.json')

var broccoli_master = multidepPackages['broccoli']['master']()
if (broccoli_master !== null) {
  ...
}

// Or:
multidepPackages['broccoli'].forEachVersion(function(version, broccoli) {
  // If broccoli-master is present, this loop will have an extra iteration
  // at the end with version === 'master'
})
```

This only works for "master", not for arbitrary versions.
