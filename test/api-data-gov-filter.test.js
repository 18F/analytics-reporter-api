const expect = require('chai').expect;
const proxyquire = require('proxyquire');
const sinon = require('sinon');

proxyquire.noCallThru();

describe('apiDataGovFilter', () => {
  let apiDataGovFilter;
  let config;
  let req;
  let res;
  let next;

  beforeEach(() => {
    config = { api_data_gov_secret: '123abc' };
    apiDataGovFilter = proxyquire('../src/api-data-gov-filter', {
      './config': config
    });
    req = {};
    res = {
      status: sinon.spy(),
      json: sinon.spy()
    };
    next = sinon.spy();
  });

  context('with a correct api.data.gov secret', () => {
    beforeEach(() => {
      req.headers = { 'api-data-gov-secret': '123abc' };
    });

    it('should allow requests to the root url', () => {
      req.path = '/';

      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should allow API requests', () => {
      req.path = '/reports/site/data?limit=100';

      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.true;
    });
  });

  context('with an incorrect api.data.gov secret', () => {
    beforeEach(() => {
      req.headers = { 'api-data-gov-secret': '456def' };
    });

    it('should allow requests to the root url', () => {
      req.path = '/';

      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should disallow API requests', () => {
      req.path = '/reports/site/data?limit=100';
      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.false;
      expect(res.status.firstCall.args[0]).to.equal(403);
      expect(res.json.firstCall.args[0]).to.deep.equal({
        message: 'Unauthorized. See https://analytics.usa.gov/developer',
        status: 403
      });
    });
  });

  context('without an api.data.gov secret', () => {
    beforeEach(() => {
      delete config.api_data_gov_secret;
      req.headers = {};
    });

    it('should allow requests to the root url', () => {
      req.path = '/';

      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.true;
    });

    it('should allow API requests', () => {
      req.path = '/reports/site/data?limit=100';

      apiDataGovFilter(req, res, next);
      expect(next.calledOnce).to.be.true;
    });
  });
});
