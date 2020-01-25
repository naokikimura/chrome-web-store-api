import { Credential, AccessTokenResponse, ItemError } from './chrome-web-store-api';
import Item from "./item";

/**
 * Chrome Web Store API
 *
 * @see https://developer.chrome.com/webstore/api_index
 */
export default class ChromeWebStore {
  constructor(protected credential: Credential, protected accessTokenResponse: AccessTokenResponse) {
  }
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get Item() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const chromeWebStore = this;
    return class extends Item {
      constructor(id: string, publicKey?: string, uploadState?: string, crxVersion?: string, itemError?: ItemError[]) {
        super(chromeWebStore, id, publicKey, uploadState, crxVersion, itemError);
      }
    };
  }
}
