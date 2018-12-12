const logger = require('../src/logger');

logger.level = 'error';

const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const request = require('supertest-as-promised');

const db = {};

const app = proxyquire('../src/app', {
  './db': db
});

describe('app', () => {
  beforeEach(() => {
    db.query = () => Promise.resolve();
  });

  it('should pass params from the url to db.query and render the result', done => {
    db.query = (params) => {
      expect(params.reportAgency).to.equal('fake-agency');
      expect(params.reportName).to.equal('fake-report');
      return Promise.resolve([
        { id: 1, date: new Date('2017-01-01') },
        { id: 2, date: new Date('2017-01-02') }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/agencies/fake-agency/reports/fake-report/data')
      .expect(200);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal([
        { id: 1, date: '2017-01-01' },
        { id: 2, date: '2017-01-02' }
      ]);
      done();
    }).catch(done);
  });

  it('should not pass the agency param if the request does not specify and agency', done => {
    db.query = (params) => {
      expect(params.reportAgency).to.be.undefined;
      expect(params.reportName).to.equal('fake-report');
      return Promise.resolve([
        { id: 1, date: new Date('2017-01-01') },
        { id: 2, date: new Date('2017-01-02') }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/reports/fake-report/data')
      .expect(200);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal([
        { id: 1, date: '2017-01-01' },
        { id: 2, date: '2017-01-02' }
      ]);
      done();
    }).catch(done);
  });

  it('should merge the params in the url with query params', done => {
    db.query = (params) => {
      expect(params.reportAgency).to.equal('fake-agency');
      expect(params.reportName).to.equal('fake-report');
      expect(params.limit).to.equal('50');
      return Promise.resolve([
        { id: 1, date: new Date('2017-01-01') },
        { id: 2, date: new Date('2017-01-02') }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/agencies/fake-agency/reports/fake-report/data?limit=50')
      .expect(200);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal([
        { id: 1, date: '2017-01-01' },
        { id: 2, date: '2017-01-02' }
      ]);
      done();
    }).catch(done);
  });

  it('should respond with a 400 if db.query rejects', done => {
    db.query = () => Promise.reject('This is a test of the emergency broadcast system.');

    const dataRequest = request(app)
      .get('/v1.1/agencies/fake-agency/reports/fake-report/data')
      .expect(400);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal({
        message: 'An error occurred. Please check the application logs.',
        status: 400
      });
      done();
    }).catch(done);
  });

  it('should respond with a 400 if the domain report is not one of the acceptable kinds of reports', done => {
    db.query = (params) => {
      expect(params.domain).to.equal('fakeiscool.gov');
      expect(params.reportName).to.equal('browser');
      return Promise.resolve([
        { id: 1, date: new Date('2017-01-01'), data: { domain: 'fakeiscool.gov' } },
        { id: 2, date: new Date('2017-01-02'), data: { domain: 'bobtown.gov' } }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/domain/fakeiscool.gov/reports/browser/data')
      .expect(400);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal({
        message: 'You are requesting a report that cannot be filtered on domain. Please try one of the following reports: site, domain, download, second-level-domain.',
        status: 400
      });
      done();
    }).catch(done);
  });

  it('should pass params from the url to db.query and render the result for a domain query for a non-download report', done => {
    db.query = (params) => {
      expect(params.domain).to.equal('fakeiscool.gov');
      expect(params.reportName).to.equal('site');
      return Promise.resolve([
        { id: 1, report_name: 'site', date: new Date('2017-01-01'), data: { domain: 'fakeiscool.gov' } }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/domain/fakeiscool.gov/reports/site/data')
      .expect(200);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal([
        { id: 1, date: '2017-01-01', domain: 'fakeiscool.gov' }
      ]);
      done();
    }).catch(done);
  });

  it('should pass params from the url to db.query and render the result for a domain query for a download report', done => {
    db.query = (params) => {
      expect(params.domain).to.equal('fakeiscool.gov');
      expect(params.reportName).to.equal('download');
      return Promise.resolve([
        { id: 1, date: new Date('2017-01-01'), report_name: 'download', data: { page: 'fakeiscool.gov/w8.pdf' } },
        { id: 2, date: new Date('2017-01-02'), report_name: 'download', data: { page: 'fakeiscool.gov/westworldtheshow/w8.pdf' } },
        { id: 3, date: new Date('2017-01-03'), report_name: 'download', data: { page: 'notiscool.gov/westworldtheshow/timewarpagain.pdf' } }
      ]);
    };

    const dataRequest = request(app)
      .get('/v1.1/domain/fakeiscool.gov/reports/download/data')
      .expect(200);

    dataRequest.then(response => {
      expect(response.body).to.deep.equal([
        { id: 1, date: '2017-01-01', page: 'fakeiscool.gov/w8.pdf', report_name: 'download' },
        { id: 2, date: '2017-01-02', report_name: 'download', page: 'fakeiscool.gov/westworldtheshow/w8.pdf' }
      ]);
      done();
    }).catch(done);
  });
});
