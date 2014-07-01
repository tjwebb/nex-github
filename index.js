/* jshint expr:true */
var exec = require('child_process').execSync,
  path = require('path'),
  fs = require('fs'),
  _ = require('lodash'),
  log = require('npmlog'),
  Q = require('q'),
  congruence = require('congruence'),
  prompt = require('prompt');

_.mixin(require('congruence'));
log.heading = 'github';
log.level = 'verbose';

function getCurlUser(options) {
  return '"' + options.username + ':' + options.password + '"';
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

github.authPrompt = function (options) {
  var deferred = Q.defer();

  log.info('authentication', 'Authentication via Github is required.');
  var schema = {
    properties: {
      org: { required: true },
      repo: { required: true },
      version: { required: true },
      username: { required: true },
      password: { hidden: true },
    }
  };
  _.each(_.keys(options || { }), function (key) {
    delete schema.properties[key];
  });
  prompt.start();
  prompt.get(schema, function (err, result) {
    deferred.resolve(github.getRelease(_.extend(result, options)));
  });

  return deferred.promise;
};

exports.getRelease = function (options) {
  options.version || (options.version = 'master');

  var deferred = Q.defer();
  var template = {
    org: _.isString,
    repo: _.isString,
    version: _.isString,
    username: _.isString,
    password: _.isString
  };
  if (!_.congruent(template, options)) {
    return github.authPrompt(options);
  }
  var curl = [
    'curl -sL', '--user', getCurlUser(options), getCurlUrl(options), '>', getFilename(options)
  ].join(' ');

  log.verbose('curl', curl);
  log.verbose('tarball url', getCurlUrl(options));
  log.http('downloading', getModuleName(options));

  exec(curl);

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
    deferred.resolve(path.resolve(getFilename(options)));
  }

  return deferred.promise;
};

if (require.main === module) github.authPrompt({
  org: 'xtuple',
  repo: 'xtuple-server-commercial',
  version: 'master',
  username: 'tjwebb'
});
