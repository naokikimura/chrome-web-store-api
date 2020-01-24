import { expect } from 'chai';
import ChromeWebStoreAPI from '../src/chrome-web-store-api';

describe('ChromeWebStoreAPI', () => {
	describe('Item', () => {
		before(async function () {
			this.chromeWebStoreAPI = new ChromeWebStoreAPI(
				JSON.parse(process.env.CHROME_WEB_STORE_API_CREDENTIAL || ''),
				JSON.parse(process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE || ''),
			);
		});

		it('it should return a item', async function() {
			const chromeWebStoreAPI = this.chromeWebStoreAPI as ChromeWebStoreAPI;
			const itemId = 'pgpnkghddnfoopjapnlklllpjknnibkn';
			const item = await chromeWebStoreAPI.Item.fetch(itemId);
			expect(item).to.have.property('id', itemId);
		});
	});
});