const expect = require('chai').expect;
const moment = require('moment');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const databaseSupport = require('./support/db');

const db = proxyquire('../src/db', {
  './config': databaseSupport.config
});

const cronDeletion = require('../src/cron-deletion');

describe('cronDeletion', () => {
  beforeEach(done => {
    databaseSupport.resetSchema().then(() => done());
  });

  describe('.deleteOldEntries(monthsAgo)', () => {
    it('should return all rows for the given agency and report', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'my-report', report_agency: 'my-agency', date: moment().subtract(20, 'months').format('YYYY-MM-DD') },
        { report_name: 'not-my-report', report_agency: 'my-agency', date: moment().subtract(2, 'months').format('YYYY-MM-DD') },
        { report_name: 'my-report', report_agency: 'not-my-agency', date: moment().format('YYYY-MM-DD') },
        { report_name: 'my-report', report_agency: null, date: moment().subtract(24, 'months').format('YYYY-MM-DD') }
      ])
      .then(() => {
        return cronDeletion.deleteOldEntries(18)
          .then(() => {
            return databaseSupport.client('analytics_data').whereRaw(true)
              .then(results => {
                expect(results).to.have.length(2);
                expect(results[0].report_name).to.equal('not-my-report');
                expect(results[0].report_agency).to.equal('my-agency');
                done();
              });
          });
      }).catch(done);
    });
  });

  describe('.cronJob(monthsAgo)', () => {
    let clock;
    beforeEach((done) => {
      clock = sinon.useFakeTimers();
      databaseSupport.resetSchema().then(() => done());
    });

    afterEach(() => {
      cronDeletion.cronJob(24).stop();
    });
    it('should call deleteOldEntries within the cronjob', done => {
      const deleteOldEntriesStub = sinon.stub(cronDeletion, 'deleteOldEntries');
      cronDeletion.cronJob(24).start();
      clock.tick(2592000000 * 2); // advance the clock two months
      expect(deleteOldEntriesStub.called).to.be.true;
      deleteOldEntriesStub.restore();
      clock.restore();
      done();
    });
  });
});

