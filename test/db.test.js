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
        return db.query({ reportName: 'my-report', reportAgency: 'my-agency' });
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
        return db.query({ reportName: 'my-report' });
      }).then(results => {
        expect(results).to.have.length(1);
        expect(results[0].report_name).to.equal('my-report');
        expect(results[0].report_agency).to.be.null;
        done();
      })
      .catch(done);
    });

    it('should sort the rows according to the date column', done => {
      databaseSupport.client('analytics_data').insert([
        { report_name: 'report', date: '2017-01-02' },
        { report_name: 'report', date: '2017-01-01' },
        { report_name: 'report', date: '2017-01-03' }
      ]).then(() => {
        return db.query({ reportName: 'report' });
      }).then(results => {
        expect(results).to.have.length(3);
        results.forEach((result, index) => {
          const resultDate = result.date.toISOString().slice(0, 10);
          const expectedDate = `2017-01-0${3 - index}`;
          expect(resultDate).to.equal(expectedDate);
        });
        done();
      })
      .catch(done);
    });

    it('should limit the rows according to the limit param', done => {
      const rows = Array(5).fill(0).map(() => {
        return { report_name: 'report', date: '2017-01-01' };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ reportName: 'report', limit: 4 });
      }).then(results => {
        expect(results).to.have.length(4);
        done();
      })
      .catch(done);
    });

    it('should default to a limit of 1000', done => {
      const rows = Array(1001).fill(0).map(() => {
        return { report_name: 'report', date: '2017-01-01' };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ reportName: 'report' });
      }).then(results => {
        expect(results).to.have.length(1000);
        done();
      })
      .catch(done);
    });

    it('should have a maximum limit of 10,000', done => {
      const rows = Array(11000).fill(0).map(() => {
        return { report_name: 'report', date: '2017-01-01' };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ reportName: 'report', limit: 11000 });
      }).then(results => {
        expect(results).to.have.length(10000);
        done();
      })
      .catch(err => {
        done(err);
      });
    });

    it('should paginate on the page param', done => {
      const rows = Array(6).fill(0).map((val, index) => {
        return { report_name: 'report', date: `2017-01-0${index + 1}` };
      });
      databaseSupport.client('analytics_data').insert(rows).then(() => {
        return db.query({ reportName: 'report', limit: 3, page: 1 });
      }).then(results => {
        expect(results).to.have.length(3);
        expect(results[0].date.toISOString()).to.match(/^2017-01-06/);
        expect(results[2].date.toISOString()).to.match(/^2017-01-04/);

        return db.query({ reportName: 'report', limit: 3, page: 2 });
      })
      .then(results => {
        expect(results).to.have.length(3);
        expect(results[0].date.toISOString()).to.match(/^2017-01-03/);
        expect(results[2].date.toISOString()).to.match(/^2017-01-01/);
        done();
      })
      .catch(done);
    });
  });
});
