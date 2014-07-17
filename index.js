var proc = require('child_process'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  congruence = require('congruence'),
  home = require('home-dir'),
  prompt = require('prompt');

global.log = require('npmlog'),
log.heading = 'nex';

_.mixin(require('congruence'));

var template = {
  private: _.isBoolean,
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
  return options.repo + '-' + options.version + options.fileext;
}

/**
 * Prepend a 'v' to the version only if it isn't already.
 */
function getTag (options) {
  return (options.version === 'master') ? 'master' : 'v' + options.version.replace(/^v/, '');
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
  options = _.defaults(options || { }, {
    private: false,
    version: 'master'
  });

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
        var filename = afterCurl(options);
        resolve(filename);
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
  options = _.defaults(options || { }, {
    private: false,
    version: 'master'
  });
  var curl = getCurlCommand(options);

  log.verbose('curl', curl);
  log.verbose('tarball url', getCurlUrl(options));
  log.http('downloading', getModuleName(options));

  proc.execSync(curl, { stdio: 'inherit' });
  return afterCurl(options);
};

if (require.main === module) github.getRelease();
