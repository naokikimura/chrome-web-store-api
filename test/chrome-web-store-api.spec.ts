import { expect } from 'chai';
import ChromeWebStore from '../src/chrome-web-store';

describe('ChromeWebStoreAPI', () => {
	before(async function () {
		this.chromeWebStoreAPI = new ChromeWebStore(
			JSON.parse(process.env.CHROME_WEB_STORE_API_CREDENTIAL || ''),
			JSON.parse(process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE || ''),
		);
	});

  describe('Item', () => {
		it('should return Item Resource', async function() {
			const chromeWebStoreAPI = this.chromeWebStoreAPI as ChromeWebStore;
			const itemId = 'pgpnkghddnfoopjapnlklllpjknnibkn';
			const item = await (new chromeWebStoreAPI.Item(itemId)).fetch();
			expect(item).to.have.property('id', itemId);
		});
	});

	describe.skip('InAppProduct', () => {
    it('should return InAppProduct Resource', async function() {
			const chromeWebStoreAPI = this.chromeWebStoreAPI as ChromeWebStore;
      const itemId = 'pgpnkghddnfoopjapnlklllpjknnibkn';
      const item = new chromeWebStoreAPI.Item(itemId);
      const sku = '';
      const inAppProduct = await (new item.InAppProduct(sku)).fetch();
      expect(inAppProduct).to.have.property('item', item);
      expect(inAppProduct).to.have.property('sku', sku);
    });
  });
});
