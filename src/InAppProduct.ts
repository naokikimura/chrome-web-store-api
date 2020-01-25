import Item from './Item';
import { InAppProductLike, InAppProductList, fetchInAppProducts, fetchInAppProduct } from './chrome-web-store-api';

export default class InAppProduct implements InAppProductLike {
  public static new(item: Item, inAppProduct: InAppProductLike): InAppProduct {
    return new InAppProduct(item, inAppProduct.sku, inAppProduct.type, inAppProduct.state, inAppProduct.localeData, inAppProduct.prices);
  }

  public static list(item: Item, gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProductList> {
    return fetchInAppProducts.call(item, gl, hl, projection)
      .then(list => {
        return {
          kind: list.kind,
          inAppProducts: list.inAppProducts.map(inAppProduct => InAppProduct.new(item, inAppProduct)),
        };
      });
  }

  public readonly kind = 'chromewebstore#inAppProduct';
  public readonly item_id: string;

  constructor(
    public readonly item: Item,
    public readonly sku: string,
    public readonly type?: 'inapp' | 'subs',
    public readonly state?: 'ACTIVE' | 'INACTIVE',
    public readonly localeData?: {
      description: string;
      languageCode: string;
      title: string;
    }[],
    public readonly prices?: {
      currencyCode: string;
      regionCode: string;
      valueMicros: number;
    }[]) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.item_id = item.id;
  }

  public async fetch(gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProduct> {
    return fetchInAppProduct.call(this, gl, hl, projection).then(this.new);
  }

  public new = (inAppProduct: InAppProductLike): InAppProduct => InAppProduct.new(this.item, inAppProduct);
}
