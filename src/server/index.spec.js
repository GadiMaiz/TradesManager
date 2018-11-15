import { expect } from 'chai';
import server from './index';

describe('Stub tests', () => {

  before(() => {
    console.log('before');
    server.start();
  });

  after(async () => {
    console.log('after');
  });

  describe('server', () => {
    it('getClientNum always returns 5', async () => {
      const res = server.getClientNum();
      expect(res).to.be.equal(5);
    });
  });

});