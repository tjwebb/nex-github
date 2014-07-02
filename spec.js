var assert = require('chai').assert;

describe('nex-github', function () {
  var github = require('./');
  log.level = 'verbose';

  describe('#getRelease', function () {

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
});
