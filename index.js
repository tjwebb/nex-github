var proc = require('child_process'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  semver = require('semver'),
  congruence = require('congruence'),
  home = require('home-dir'),
  targz = require('tar.gz'),
  prompt = require('prompt');

global.log = require('npmlog'),
log.heading = 'nex';

_.mixin(require('congruence'));

var template = {
  org: _.isString,
  repo: _.isString,
  version: _.isString
};

prompt.properties = {
  org: { required: true },
  repo: { required: true },
  version: { required: true },
  username: { required: true },
  password: { hidden: true, required: true },
};

function getGithubUser(options) {
  return options.username + ':' + options.password;
}

function getCurlUser(options) {
  return '"' + getGithubUser(options) + '"';
}

function getCurlUrl (options) {
  options.type = (options.version === 'master') ? 'tarball' : 'archive';
  options.urlext = (options.type === 'tarball') ? '' : '.tar.gz';
  options.fileext = (options.type === 'tarball') ? '.tar' : '.tar.gz';

  log.verbose('slug type', options.type);
  log.verbose('slug ext', options.urlext);

  return 'https://' + path.join(
    'github.com', options.org, options.repo, options.type, getTag(options) + options.urlext
  );
}

function getCurlCommand(options) {
  return [ 'curl -sL', '--user', getCurlUser(options), getCurlUrl(options), '>', getFilename(options) ].join(' ');
}

function getModuleName (options) {
  return options.repo + '@' + options.version;
}

function getFilename (options) {
  options.type = (options.version === 'master') ? 'tarball' : 'archive';
  options.urlext = (options.type === 'tarball') ? '' : '.tar.gz';
  options.fileext = (options.type === 'tarball') ? '.tar' : '.tar.gz';

  options.filename = options.repo + '-' + options.version + options.fileext;

  return options.filename;
}

/**
 * Prepend a 'v' to the version only if it isn't already.
 */
function getTag (options) {
  if (semver.valid(options.version)) {
    return 'v' + options.version.replace(/^v/, '');
  }
  else {
    return options.version.slice(0, 7);
  }
}

function afterCurl (options) {
  log.http('done', getFilename(options));

  if (!fs.existsSync(getFilename(options))) {
    log.verbose('downloaded slug', getFilename(options), 'does not exist');
    throw new Error('Release was not successfully downloaded.');
  }
  else if (/Hello future GitHubber/.test(fs.readFileSync(getFilename(options)).toString())) {
    log.verbose('authentication', 'failed');
    throw new Error('Incorrect Github credentials/info was provided');
  }
  else {
    return path.resolve(getFilename(options));
  }
}

function afterExtract (options) {
  log.info('tarball', 'extracted');

  log.verbose('afterExtract', options.extract);
  log.verbose('afterExtract', path.basename(getFilename(options), options.fileext));
  var subfolder = path.resolve(options.extract, path.basename(getFilename(options), options.fileext));
  log.verbose('afterExtract subfolder', subfolder);

  proc.execSync([ 'cp -r', path.resolve(subfolder, '*'), options.target + '/' ].join(' '));
  rimraf.sync(path.resolve(options.extract));
  fs.unlinkSync(options.filename);
}

var github = exports;

github.storeCredentials = function () {
  log.info('authentication', 'This tool will create a .git-credentials file');
  log.info('authentication', 'https://www.kernel.org/pub/software/scm/git/docs/git-credential-store.html');
  log.info('authentication', 'Please enter your Github login info');

  prompt.start();

  return new Promise(function (resolve, reject) {
    prompt.get([ 'username', 'password' ], function (err, result) {
      if (err) {
        console.log();
        log.warn('prompt', 'canceled');
        reject();
      }
      var gitCredentials = path.resolve(home(), '.git-credentials');
      fs.writeFileSync(gitCredentials, 'https://'+ getGithubUser(options) + '@github.com');
      fs.chmodSync(gitCredentials, '700');

      log.info('authentication', '~/.git-credentials file created');
      resolve();
    });
  });
};

github.showPrompt = function (options) {
  log.info('authentication', 'Authentication via Github is required.');

  prompt.start();

  return new Promise(function (resolve, reject) {
    prompt.get(_.difference(_.keys(prompt.properties), _.keys(options)), function (err, result) {
      if (err) {
        console.log();
        log.warn('prompt', 'canceled');
        process.exit(1);
      }
      resolve(github.getRelease(_.extend({ }, result, options)));
    });
  });
};

github.getRelease = function (options) {
  options || (options = { });

  if (!options.version) {
    throw new TypeError('version is required');
  }

  if ((options.private && !options.password) || !_.similar(template, options)) {
    return github.showPrompt(options);
  }

  return new Promise(function (resolve, reject) {
    var curl = getCurlCommand(options);

    log.verbose('curl', curl);
    log.verbose('tarball url', getCurlUrl(options));
    log.http('downloading', getModuleName(options));

    var child = proc.exec(curl);
    child.on('exit', function (err, code) {
      if (err) reject(err);

      try {
        afterCurl(options);
        resolve(options);
      }
      catch (e) {
        reject(e);
      }
    });
  });
};

/**
 * @param options.username
 * @param options.password
 * @param options.org
 * @param options.repo
 * @param options.version
 */
github.getRelease.sync = function (options) {
  var curl = getCurlCommand(options);

  log.verbose('curl', curl);
  log.verbose('tarball url', getCurlUrl(options));
  log.http('downloading', getModuleName(options));

  proc.execSync(curl);
  afterCurl(options);

  return options;
};

/**
 * @param options.target
 * @param options.username
 * @param options.password
 * @param options.org
 * @param options.repo
 * @param options.version
 */
github.extractRelease = function (options) {
  options.tarball = getFilename(options);
  options.extract = '/tmp';

  log.info('tarball', 'extracting', tarball);

  new Promise(function (resolve, reject) {
    new targz().extract(options.tarball, options.extract, function (err) {
      if (err) reject(err);

      try {
        afterExtract(options);
        resolve(options);
      }
      catch (e) {
        reject(e);
      }
    });
  });
};

github.extractRelease.sync = function (options) {
  options.tarball = getFilename(options);
  options.extract = '/tmp';

  rimraf.sync(options.extract);
  if (!options.target) {
    throw new Error('must specify an extraction target');
  }

  mkdirp.sync(options.target);

  var cmd = [ 
    path.resolve(__dirname, 'node_modules/.bin/targz'),
    '-x', options.tarball,
    options.extract
  ].join(' ');

  log.verbose('tar.gz cmd', cmd);

  log.info('tarball', 'extracting', options.tarball);
  proc.execSync(cmd);
  afterExtract(options);

  return options;
};

if (require.main === module) github.getRelease();
