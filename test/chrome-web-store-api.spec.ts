import { expect } from 'chai';
import ChromeWebStore from '../src/chrome-web-store';
import InAppProduct from '../src/in-app-product';
import License from '../src/license';

describe('ChromeWebStoreAPI', () => {
	before(async function () {
		this.chromeWebStore = new ChromeWebStore(
			JSON.parse(process.env.CHROME_WEB_STORE_API_CREDENTIAL || ''),
			JSON.parse(process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE || ''),
		);
	});

  describe('Item', () => {
		it('should return Item Resource', async function() {
			const chromeWebStore = this.chromeWebStore as ChromeWebStore;
			const itemId = 'pgpnkghddnfoopjapnlklllpjknnibkn';
			const item = await (new chromeWebStore.Item(itemId)).fetch();
			expect(item).to.have.property('id', itemId);
		});
	});

	describe.skip('InAppProduct', () => {
    it('should return InAppProduct Resource', async function() {
			const chromeWebStore = this.chromeWebStore as ChromeWebStore;
      const itemId = ''; // TODO:
      const sku = ''; // TODO:
      const inAppProduct = await (new InAppProduct(chromeWebStore, itemId, sku)).fetch();
      expect(inAppProduct).to.have.property('state');
    });
  });

  describe.skip('License', () => {
    it('should return License Resource', async function() {
			const chromeWebStore = this.chromeWebStore as ChromeWebStore;
      const appId = ''; // TODO:
      const userId = ''; // TODO:
      const license = await (new License(chromeWebStore, appId, userId)).fetch();
      expect(license).to.have.property('result');
    });
  });
});
