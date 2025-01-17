import { Credential, AccessTokenResponse, ItemError, ItemLike, Contents, fetchItem, insertItem, publishItem, PublishItemResult, PublishTarget, uploadItem, UploadType, refreshToken } from './chrome-web-store-api.js';

/**
 * Chrome Web Store API
 *
 * @see https://developer.chrome.com/webstore/api_index
 */
export default class ChromeWebStore {
  constructor(protected credential: Credential, protected accessTokenResponse: AccessTokenResponse) {
  }
  get Item() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const chromeWebStore = this;
    return class Item implements ItemLike {
      readonly kind = "chromewebstore#item";

      constructor(public readonly id: string, public readonly publicKey?: string, public readonly uploadState?: string, public readonly crxVersion?: string, public readonly itemError?: ItemError[]) {
      }

      refreshToken(): Promise<AccessTokenResponse> {
        return refreshToken.call(chromeWebStore);
      }

      fetch(projection: 'DRAFT' | 'PUBLISHED' = 'DRAFT'): Promise<Item> {
        return fetchItem.call(this, projection).then(this.new);
      }

      insert(uploadType: UploadType = 'media', publisherEmail?: string): Promise<Item> {
        return insertItem.call(this, uploadType, publisherEmail).then(this.new);
      }

      upload(contents: Contents, uploadType?: UploadType): Promise<Item> {
        return uploadItem.call(this, contents, uploadType).then(this.new);
      }

      publish(publishTarget?: PublishTarget): Promise<PublishItemResult> {
        return publishItem.call(this, publishTarget);
      }

      new = ({ id, publicKey, uploadState, crxVersion, itemError }: ItemLike): Item => new Item(id, publicKey, uploadState, crxVersion, itemError);
    };
  }
}
