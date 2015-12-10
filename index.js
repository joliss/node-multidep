'use strict'

var fs = require('fs')
var path = require('path')
var spawn = require('spawn-cmd').spawn
var RSVP = require('rsvp')
var rimraf = require('rimraf')

// Check that all referenced versions referenced by the spec exist, and
// additionally pick up master versions. Return a hash of packages.
module.exports = function multidep(specPath) {
  var spec = getSpec(specPath)

  var packages = {}
  Object.keys(spec.versions).sort().forEach(function(packageName) {
    packages[packageName] = new PackageCollection
    spec.versions[packageName].forEach(function(version) {
      var packagePath = path.join(spec.path, packageName + '-' + version)
      if (!fs.existsSync(packagePath)) {
        throw new Error(packagePath + ': No such file or directory. Run `multidep` to install.')
      }
      var absPath = fs.realpathSync(path.join(packagePath, 'node_modules', packageName))
      packages[packageName][version] = require.bind(global, absPath)
      packages[packageName].versions.push(version)
    })

    var masterPath = path.join(spec.path, packageName + '-master')
    if (fs.existsSync(masterPath)) {
      var absPath = fs.realpathSync(masterPath)
      packages[packageName]['master'] = require.bind(global, absPath)
      packages[packageName].versions.push('master')
    } else {
      packages[packageName]['master'] = function() { return null }
    }
  })

  function multidepRequire(packageName, version) {
    if (packages[packageName] == null) {
      throw new Error("Package '" + packageName + "' not found in " + specPath)
    }
    var versions = packages[packageName]
    if (versions[version] == null) {
      if (version === 'master') {
        return null
      } else {
        throw new Error("Version " + version + " of package '" + packageName + "' not found in " + specPath)
      }
    }
    return versions[version]()
  }

  multidepRequire.forEachVersion = function forEachVersion(packageName, cb) {
    if (packages[packageName] == null) {
      throw new Error("Package '" + packageName + "' not found in " + specPath)
    }
    packages[packageName].forEachVersion(cb)
  }

  multidepRequire.packages = packages

  return multidepRequire
}

module.exports.install = function(specPath) {
  var spec = getSpec(specPath)

  if (!fs.existsSync(spec.path)) {
    fs.mkdirSync(spec.path)
  }

  var promise = RSVP.resolve()
  Object.keys(spec.versions).sort().forEach(function(packageName) {
    spec.versions[packageName].forEach(function(version) {
      promise = promise.then(function() {
        var packagePath = path.join(spec.path, packageName + '-' + version)
        return RSVP.resolve()
          .then(function() {
            if (!fs.existsSync(packagePath)) {
              console.log(packageName + ' ' + version + ': Installing')
              fs.mkdirSync(packagePath)
              fs.mkdirSync(path.join(packagePath, 'node_modules'))
              var cp = spawn('npm', ['install', packageName + '@' + version], {
                cwd: packagePath,
                stdio: 'inherit',
                timeout: 300
              })
              return new RSVP.Promise(function(resolve, reject) {
                cp.on('exit', function(code, signal) {
                  if (code !== 0 || signal != null) {
                    reject(new Error('npm exited with exit code ' + code + ', signal ' + signal))
                  } else {
                    resolve()
                  }
                })
              })
            } else {
              console.log(packageName + ' ' + version + ': Installed')
            }
          })
          .catch(function(err) {
            // We created a nested promise with `RSVP.resolve()` above so this
            // .catch clause only applies to the previous .then and doesn't
            // catch earlier failures in the chain
            rimraf.sync(packagePath)
            throw err
          })
      })
    })
  })
  return promise
}

function getSpec(specPath) {
  // specPath is relative to cwd, so we need to call realpathSync
  var spec = require(fs.realpathSync(specPath))
  if (!spec || !spec.hasOwnProperty('path') || Array.isArray(spec.versions)) {
    throw new Error('Invalid version spec; expected { path: "test/multidep", versions: { ... } }, got ' +
      require('util').inspect(spec))
  }
  return spec
}

function PackageCollection() {
  // We cannot use Object.keys(this) to get the versions because we want to
  // preserve the order in which they are listed in the spec
  this.versions = []
}

PackageCollection.prototype.forEachVersion = function(cb) {
  for (var i = 0; i < this.versions.length; i++) {
    var module = this[this.versions[i]]() // require
    cb(this.versions[i], module)
  }
}
