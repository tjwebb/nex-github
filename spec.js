var assert = require('assert');
var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

describe('nex-github', function () {
  var github = require('./');
  log.level = 'verbose';

  describe('#extractRelease.sync', function () {
    describe('@public', function () {
      var target = path.resolve(__dirname, 'mochaextracttest');

      before(function () {
        var result = github.getRelease.sync({ org: 'tjwebb', repo: 'nex', version: '2.0.14' });

        assert(_.isString(result.filename));
        assert(fs.existsSync(result.filename));

        rimraf.sync(target);
      });

      it('should extract a downloaded public release', function () {
        var target = path.resolve(__dirname, 'mochaextracttest');
        github.extractRelease.sync({
          org: 'tjwebb',
          repo: 'nex',
          version: '2.0.14',
          target: target
        });

        assert(_.contains(fs.readdirSync(target), 'package.json'));

      });
    });
  });
  describe('#extractRelease.sync', function () {
    describe('@public', function () {
      var target = path.resolve(__dirname, 'mochaextracttest');


      it('can chain promises', function () {
        this.timeout(5000);

        var release = { org: 'tjwebb', repo: 'nex', version: '2.0.14' };

        github.getRelease(release)
          .then(function (filename) {
            release.target = process.cwd();
            return github.extractRelease(release);
          })
          .then(function () {
            done();
          })
          .catch(function (err) {
            done(err);
          });
      });
    });
  });

  describe('#getRelease.sync', function () {

    describe('@public', function () {

      it('should download a public release without authentication', function () {
        var result = github.getRelease.sync({ org: 'tjwebb', repo: 'nex', version: '2.0.14' });

        assert(_.isString(result.filename));
        assert(fs.existsSync(result.filename));
      });


    });
  });

  describe('#getRelease', function () {

    describe('@public', function () {

      it('should download a public release without authentication', function (done) {
        this.timeout(5000);

        github.getRelease({ org: 'tjwebb', repo: 'nex', version: '2.0.14' })
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
        this.timeout(0);

        github.getRelease({ org: 'xtuple', repo: 'xtuple-server-commercial', version: '1.0.9', private: true })
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
