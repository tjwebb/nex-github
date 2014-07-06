var assert = require('chai').assert;

describe('nex-github', function () {
  var github = require('./');
  log.level = 'verbose';

  describe('#getRelease', function () {

    describe('@public', function () {

      it('should download a public release without authentication', function (done) {
        this.timeout(5000);

        github.getRelease({ org: 'tjwebb', repo: 'nex' })
          .then(function () {
            assert.isTrue(true);
            done();
          }, function () {
            assert.fail();
          });
      });

    });
    describe('@private', function () {
      /** This can be un-skipped for local development */
      it('should download a private release with authentication', function (done) {
        this.timeout(5000);

        github.getRelease({ org: 'xtuple', repo: 'xtuple-server-commercial', private: true })
          .then(function () {
            assert.isTrue(true);
            done();
          }, function () {
            assert.fail();
          });
      });
    });
  });
});
