import ChromeWebStore from './chrome-web-store';
import { ItemLike, ItemError, fetchItem, UploadType, insertItem, Contents, uploadItem, PublishTarget, PublishItemResult, publishItem, InAppProductList } from './chrome-web-store-api';

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
}
