nex-github
===============

[![Build Status](https://travis-ci.org/tjwebb/nex-github.svg?branch=master)](https://travis-ci.org/tjwebb/nex-github)

Easily download and extract private (or public) github releases as tarballs

## Usage

### synchronous

```js
  var release = { org: 'tjwebb', repo: 'nex', version: '2.0.14' });

  // download github release tarball, and return path to the file
  var filename = github.getRelease.sync(release);

  // extract tarball into current directory
  release.target = process.cwd();
  github.extractRelease.sync(release);
```

### asynchronous (promises)

```js
  var release = { org: 'tjwebb', repo: 'nex', version: '2.0.14' });

  // download github release tarball, and return path to the file
  github.getRelease(release)
    .then(function(result) {
      // tarball has been downloaded as result.filename

      // extract tarball into current directory
      release.target = process.cwd();
      return github.extractRelease(release);
    })
    .then(function (result) {
      // tarball has been extracted into result.target
      
    })
    .catch(function (e) {
      log.error('uh-oh', e.message);
    });
```
