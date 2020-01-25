import { InAppProductLike, InAppProductList, fetchInAppProducts, fetchInAppProduct } from './chrome-web-store-api';
import ChromeWebStore from './chrome-web-store';

export default class InAppProduct implements InAppProductLike {
  public static new(chromewebstore: ChromeWebStore, inAppProduct: InAppProductLike): InAppProduct {
    return new InAppProduct(chromewebstore, inAppProduct.item_id, inAppProduct.sku, inAppProduct.type, inAppProduct.state, inAppProduct.localeData, inAppProduct.prices);
  }

  public static list(chromewebstore: ChromeWebStore, itemId: string, gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProductList> {
    return fetchInAppProducts.call(chromewebstore, itemId, gl, hl, projection)
      .then(list => {
        return {
          kind: list.kind,
          inAppProducts: list.inAppProducts.map(inAppProduct => InAppProduct.new(chromewebstore, inAppProduct)),
        };
      });
  }

  public readonly kind = 'chromewebstore#inAppProduct';

  constructor(
    public readonly chromeWebStore: ChromeWebStore,
    public readonly item_id: string,
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
  }

  public async fetch(gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProduct> {
    return fetchInAppProduct.call(this, gl, hl, projection).then(this.new);
  }

  public new = (inAppProduct: InAppProductLike): InAppProduct =>
    InAppProduct.new(this.chromeWebStore, inAppProduct);
}
