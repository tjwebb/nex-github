var assert = require('assert');
var _ = require('lodash');
var fs = require('fs');

describe('nex-github', function () {
  var github = require('./');
  log.level = 'verbose';

  describe('#getRelease.sync', function () {

    describe('@public', function () {

      it('should download a public release without authentication', function () {
        var filename = github.getRelease.sync({ org: 'tjwebb', repo: 'nex' });

        assert(_.isString(filename));
        assert(fs.existsSync(filename));
      });

      it('should download a public release without authentication', function () {
        var filename = github.getRelease.sync({ org: 'tjwebb', repo: 'nex', version: '2.0.14' });

        assert(_.isString(filename));
        assert(fs.existsSync(filename));
      });

    });
  });

  describe('#getRelease', function () {

    describe('@public', function () {

      it('should download a public release without authentication', function (done) {
        this.timeout(5000);

        github.getRelease({ org: 'tjwebb', repo: 'nex' })
          .then(function () {
            done();
          })
          .catch(function (err) {
            done(err);
          });
      });

    });
    describe('@private', function () {
      /** This can be un-skipped for local development */
      it('should download a private release with authentication', function (done) {
        this.timeout(5000);

        github.getRelease({ org: 'xtuple', repo: 'xtuple-server-commercial', private: true })
          .then(function () {
            done();
          })
          .catch(function (err) {
            done(err);
          });
      });
    });
  });
});
