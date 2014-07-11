/* jshint expr:true */
var proc = require('child_process'),
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  Q = require('q'),
  congruence = require('congruence'),
  home = require('home-dir'),
  prompt = require('prompt');

global.log = require('npmlog'),
log.heading = 'nex';

_.mixin(require('congruence'));

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

var github = exports;

github.storeCredentials = function () {
  var deferred = Q.defer();

  log.info('authentication', 'This tool will create a .git-credentials file');
  log.info('authentication', 'https://www.kernel.org/pub/software/scm/git/docs/git-credential-store.html');
  log.info('authentication', 'Please enter your Github login info');

  prompt.start();
  prompt.get([ 'username', 'password' ], function (err, result) {
    if (err) {
      console.log();
      log.warn('prompt', 'canceled');
      process.exit(1);
    }
    var gitCredentials = path.resolve(home(), '.git-credentials');
    fs.writeFileSync(gitCredentials, 'https://'+ getGithubUser(options) + '@github.com');
    fs.chmodSync(gitCredentials, '700');

    log.info('authentication', '~/.git-credentials file created');
    deferred.resolve();
  });

  return deferred.promise;
};

github.showPrompt = function (options) {
  var deferred = Q.defer();

  log.info('authentication', 'Authentication via Github is required.');

  prompt.start();
  prompt.get(_.difference(_.keys(prompt.properties), _.keys(options)), function (err, result) {
    if (err) {
      console.log();
      log.warn('prompt', 'canceled');
      process.exit(1);
    }
    deferred.resolve(github.getRelease(_.extend({ }, result, options)));
  });

  return deferred.promise;
};

github.getRelease = function (options) {
  var deferred = Q.defer();

  options = _.defaults(options || { }, {
    private: false,
    version: 'master'
  });

  var template = {
    private: _.isBoolean,
    org: _.isString,
    repo: _.isString,
    version: _.isString
  };
  if ((options.private && !options.password) || !_.similar(template, options)) {
    return github.showPrompt(options);
  }
  var curl = [
    'curl -sL', '--user', getCurlUser(options), getCurlUrl(options), '>', getFilename(options)
  ].join(' ');

  log.verbose('curl', curl);
  log.verbose('tarball url', getCurlUrl(options));
  log.http('downloading', getModuleName(options));

  var child = proc.exec(curl);
  child.on('exit', function (err, code) {
    if (err) deferred.reject(err);

    log.http('done', getFilename(options));

    if (!fs.existsSync(getFilename(options))) {
      log.verbose('downloaded slug', getFilename(options), 'does not exist');
      deferred.reject(new Error('Release was not successfully downloaded.'));
    }
    else if (/Hello future GitHubber/.test(fs.readFileSync(getFilename(options)).toString())) {
      log.verbose('authentication', 'failed');
      deferred.reject(new Error('Incorrect Github credentials/info was provided'));
    }
    else {
      log.verbose('curl exit', getFilename(options));
      if (options.private) {
        var gitCredentials = path.resolve(home(), '.git-credentials');
        fs.writeFileSync(gitCredentials, 'https://'+ getGithubUser(options) + '@github.com');
        fs.chmodSync(gitCredentials, '700');
      }
      deferred.resolve(path.resolve(getFilename(options)));
    }
  });

  return deferred.promise;
};

if (require.main === module) github.getRelease();
