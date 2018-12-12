const expect = require('chai').expect;
const moment = require('moment');
const proxyquire = require('proxyquire');
const databaseSupport = require('./support/db');

const db = proxyquire('../src/db', {
  './config': databaseSupport.config
});

const cronDeletion = ('../src/cron-deletion');

describe('cronDeletion', () => {
  beforeEach(done => {
    databaseSupport.resetSchema().then(() => done());
  });

  describe('.deleteOldEntries(monthsAgo)', () => {
    it.only('should return all rows for the given agency and report', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'my-report', report_agency: 'my-agency', date: moment().subtract(20, 'months').format('YYYY-MM-DD') },
        { report_name: 'not-my-report', report_agency: 'my-agency', date: moment().subtract(2, 'months').format('YYYY-MM-DD') },
        { report_name: 'my-report', report_agency: 'not-my-agency', date: moment().format('YYYY-MM-DD') },
      { report_name: 'my-report', report_agency: null }
      ]).then(() => {
        return cronDeletion.deletedeleteOldEntries(18);
      }).then(results => {
        expect(results).to.have.length(2);
        expect(results[0].report_name).to.equal('not-my-report');
        expect(results[0].report_agency).to.equal('my-agency');
        expect(results[0].report_name).to.equal('my-report');
        expect(results[0].report_agency).to.equal('my-agency');
        done();
      })
      .catch(done);
    });
  });
});
