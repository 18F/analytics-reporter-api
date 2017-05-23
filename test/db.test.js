const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const databaseSupport = require('./support/db');

const db = proxyquire('../src/db', {
  './config': databaseSupport.config
});

describe('db', () => {
  beforeEach(done => {
    databaseSupport.resetSchema().then(() => done());
  });

  describe('.query(params)', () => {
    it('should return all rows for the given agency and report', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'my-report', report_agency: 'my-agency' },
        { report_name: 'not-my-report', report_agency: 'my-agency' },
        { report_name: 'my-report', report_agency: 'not-my-agency' },
        { report_name: 'my-report', report_agency: null }
      ]).then(() => {
        return db.query({ report_name: 'my-report', report_agency: 'my-agency' });
      }).then(results => {
        expect(results).to.have.length(1);
        expect(results[0].report_name).to.equal('my-report');
        expect(results[0].report_agency).to.equal('my-agency');
        done();
      })
      .catch(done);
    });

    it('should return all rows without an agency if no agency name is given', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'my-report', report_agency: 'not-my-agency' },
        { report_name: 'my-report', report_agency: null }
      ]).then(() => {
        return db.query({ report_name: 'my-report' });
      }).then(results => {
        expect(results).to.have.length(1);
        expect(results[0].report_name).to.equal('my-report');
        expect(results[0].report_agency).to.be.null;
        done();
      })
      .catch(done);
    });

    it('should sort the rows according to the date_time column', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'report', date_time: new Date(2000) },
        { report_name: 'report', date_time: new Date(1000) },
        { report_name: 'report', date_time: new Date(3000) }
      ]).then(() => {
        return db.query({ report_name: 'report' });
      }).then(results => {
        expect(results).to.have.length(3);
        expect(results[0].date_time.getTime()).to.equal(3000);
        expect(results[1].date_time.getTime()).to.equal(2000);
        expect(results[2].date_time.getTime()).to.equal(1000);
        done();
      })
      .catch(done);
    });

    it('should limit the rows according to the limit param', done => {
      const rows = Array(5).fill(0).map((val, index) => {
        return { report_name: 'report', date_time: new Date(index * 1000) };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ report_name: 'report', limit: 4 });
      }).then(results => {
        expect(results).to.have.length(4);
        done();
      })
      .catch(done);
    });

    it('should default to a limit of 1000', done => {
      const rows = Array(1001).fill(0).map((val, index) => {
        return { report_name: 'report', date_time: new Date(index * 1000) };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ report_name: 'report' });
      }).then(results => {
        expect(results).to.have.length(1000);
        done();
      })
      .catch(done);
    });

    it('should have a maximum limit of 10,000', done => {
      const rows = Array(11000).fill(0).map((val, index) => {
        return { report_name: 'report', date_time: new Date(index * 1000) };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ report_name: 'report', limit: 11000 });
      }).then(results => {
        expect(results).to.have.length(10000);
        done();
      })
      .catch(done);
    });

    it('should paginate on the page param', done => {
      const rows = Array(6).fill(0).map((val, index) => {
        return { report_name: 'report', date_time: new Date(index * 1000) };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ report_name: 'report', limit: 3, page: 1 });
      })
      .then(results => {
        expect(results).to.have.length(3);
        expect(results[0].date_time.getTime()).to.equal(5000);
        expect(results[2].date_time.getTime()).to.equal(3000);

        return db.query({ report_name: 'report', limit: 3, page: 2 });
      })
      .then(results => {
        expect(results).to.have.length(3);
        expect(results[0].date_time.getTime()).to.equal(2000);
        expect(results[2].date_time.getTime()).to.equal(0);
        done();
      })
      .catch(done);
    });
  });
});
