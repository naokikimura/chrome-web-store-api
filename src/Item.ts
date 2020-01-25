import ChromeWebStore from './chrome-web-store';
import { ItemLike, ItemError, fetchItem, UploadType, insertItem, Contents, uploadItem, PublishTarget, PublishItemResult, publishItem, InAppProductList } from './chrome-web-store-api';
import InAppProduct from "./in-app-product";

export default class Item implements ItemLike {
  public static new = (chromeWebStore: ChromeWebStore, { id, publicKey, uploadState, crxVersion, itemError }: ItemLike): Item => new Item(chromeWebStore, id, publicKey, uploadState, crxVersion, itemError);

  public readonly kind = "chromewebstore#item";

  constructor(public readonly chromeWebStore: ChromeWebStore, public readonly id: string, public readonly publicKey?: string, public readonly uploadState?: string, public readonly crxVersion?: string, public readonly itemError?: ItemError[]) {
  }

  public fetch(projection: 'DRAFT' | 'PUBLISHED' = 'DRAFT'): Promise<Item> {
    return fetchItem.call(this, projection).then(this.new);
  }

  public insert(uploadType: UploadType = 'media', publisherEmail?: string): Promise<Item> {
    return insertItem.call(this, uploadType, publisherEmail).then(this.new);
  }

  public upload(contents: Contents, uploadType?: UploadType): Promise<Item> {
    return uploadItem.call(this, contents, uploadType).then(this.new);
  }

  public publish(publishTarget?: PublishTarget): Promise<PublishItemResult> {
    return publishItem.call(this, publishTarget);
  }

  public new = (itemLike: ItemLike): Item => Item.new(this.chromeWebStore, itemLike);

  public fetchInAppProducts(gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProductList> {
    return InAppProduct.list(this, gl, hl, projection);
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  get InAppProduct() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const item = this;
    return class extends InAppProduct {
      constructor(sku: string,
        type?: 'inapp' | 'subs',
        state?: 'ACTIVE' | 'INACTIVE',
        localeData?: {
          description: string;
          languageCode: string;
          title: string;
        }[],
        prices?: {
          currencyCode: string;
          regionCode: string;
          valueMicros: number;
        }[]) {
        super(item, sku, type, state, localeData, prices);
      }
    };
  }
}
