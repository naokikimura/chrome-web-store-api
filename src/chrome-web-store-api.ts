import { ClientRequest, IncomingMessage, RequestOptions } from 'http';
import querystring from 'querystring';
import stream from 'stream';
import { URL } from 'url';
import util from 'util';

const debug = util.debuglog('chrome-web-store-api');
const agent = undefined;

function createRequest(url: string | URL, options: RequestOptions): ClientRequest {
  url = new URL(url.toString());
  return require(url.protocol.replace(/:$/, '')).request(url, Object.assign({ agent }, options));
}

function fetch(request: ClientRequest): Promise<IncomingMessage> {
  debug(`${request.method} ${request.path} HTTP/1.1`);
  for (const [key, value] of Object.entries(request.getHeaders())) debug(`${key}: ${value}`);
  return new Promise<IncomingMessage>((resolve, reject) => {
    request.on('response', resolve).on('error', reject).end();
  });
}

function toJSON<T>(response: IncomingMessage): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const data: Array<Buffer | string> = [];
    response
      .on('data', (chunk: Buffer | string) => { data.push(chunk); })
      .on('end', () => {
        const body = data.join('');
        try {
          debug(body);
          resolve(JSON.parse(body) as T);
        } catch (error) {
          reject(error);
        }
      })
      .on('error', reject);
  });
}

function isSuccessful(response: IncomingMessage): boolean {
  return response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode <= 299;
}

type ResponseConditionFunction = (response: IncomingMessage) => boolean;
type ResponseParseFunction<T> = (response: IncomingMessage) => Promise<T>;

function ResponseParser<T>(condition: ResponseConditionFunction, parse: ResponseParseFunction<T>) {
  return function parseResponse(response: IncomingMessage): Promise<T> {
    debug(`HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}`);
    for (const [key, value] of Object.entries(response.headers)) debug(`${key}: ${value}`);
    if (!condition(response)) {
      throw new class extends Error {
        public readonly response: IncomingMessage;
        constructor(message: IncomingMessage) {
          super(response.statusMessage);
          this.response = message;
        }
      }(response);
    }
    return parse(response);
  };
}

export interface Credential {
  installed: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret: string;
    redirect_uris: string[];
  };
}

export interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

export interface InAppProductLike {
  kind: 'chromewebstore#inAppProduct';
  item_id: string;
  sku: string;
  type?: 'inapp' | 'subs';
  state?: 'ACTIVE' | 'INACTIVE';
  localeData?: {
    description: string;
    languageCode: string;
    title: string;
  }[];
  prices?: {
    currencyCode: string;
    regionCode: string;
    valueMicros: number;
  }[];
}

export interface InAppProductList {
  kind: 'chromewebstore#inAppProductList';
  inAppProducts: InAppProductLike[];
}

export type UploadType = '' | 'media';
export type PublishTarget = 'trustedTesters' | 'default';
export type Contents = string | Buffer | stream.Readable;

export interface ItemLike {
  id: string;
  kind: 'chromewebstore#item';
  publicKey?: string;
  uploadState?: string;
  crxVersion?: string;
  itemError?: ItemError[];
}

export interface ItemError {
  error_detail: string;
}

export interface PublishItemResult {
  kind: 'chromewebstore#item';
  item_id: string;
  status: string[];
  statusDetail: string[];
}

/**
 * 
 * @param this 
 */
async function refreshToken(this: ChromeWebStoreAPI): Promise<AccessTokenResponse> {
  const url = new URL(this.credential.installed.token_uri);
  const request = createRequest(url, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  request.write(querystring.stringify({
    'client_id': this.credential.installed.client_id,
    'client_secret': this.credential.installed.client_secret,
    'grant_type': 'refresh_token',
    'refresh_token': this.accessTokenResponse.refresh_token,
  }));
  return Object.assign(
    this.accessTokenResponse,
    await fetch(request).then(ResponseParser<AccessTokenResponse>(isSuccessful, toJSON)),
  );
}

/**
 * Gets a Chrome Web Store item.
 *
 * @param this 
 * @param id Unique identifier representing the Chrome App, Chrome Extension, or the Chrome Theme.
 * @param projection Determines which subset of the item information to return.
 * @see https://developer.chrome.com/webstore/webstore_api/items/get
 */
async function fetchItem(this: Item, projection: 'DRAFT' | 'PUBLISHED' = 'DRAFT'): Promise<ItemLike> {
  const { access_token: token } = await refreshToken.call(this.chromeWebStore);
  const url = new URL(this.id, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
  url.searchParams.set('projection', projection);
  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-goog-api-version': 2,
    },
    method: 'GET',
  });
  return fetch(request)
    .then(ResponseParser<ItemLike>(isSuccessful, toJSON))
    .then(item => {
      debug(util.inspect(item));
      return item;
    });
}

/**
 * This method supports an upload URI and accepts uploaded media.
 *
 * @param this 
 * @param uploadType The type of upload request to the `/upload URI.
 * @param publisherEmail The email of the publisher who owns the items.
 * @see https://developer.chrome.com/webstore/webstore_api/items/insert
 */
async function insertItem(this: Item, uploadType: UploadType = 'media', publisherEmail?: string): Promise<ItemLike> {
  const { access_token: token } = await refreshToken.call(this.chromeWebStore);
  const url = new URL('https://www.googleapis.com/upload/chromewebstore/v1.1/items');
  url.searchParams.set('uploadType', uploadType);
  if (publisherEmail) url.searchParams.set('publisherEmail', publisherEmail);

  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Length': 0,
      'x-goog-api-version': 2,
    },
    method: 'POST',
  });
  return fetch(request).then(ResponseParser<ItemLike>(isSuccessful, toJSON));
}

/**
 * Updates an existing item.
 *
 * @param this 
 * @param contents Item
 * @param uploadType The type of upload request to the /upload URI
 * @see https://developer.chrome.com/webstore/webstore_api/items/update
 */
async function uploadItem(this: Item, contents: Contents, uploadType: UploadType = ''): Promise<ItemLike> {
  const { access_token: token } = await refreshToken.call(this.chromeWebStore);
  const url = new URL(this.id, 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/');
  url.searchParams.set('uploadType', uploadType);
  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-goog-api-version': 2,
    },
    method: 'PUT',
  });
  if (contents instanceof stream.Readable) {
    contents.pipe(request);
  } else {
    request.write(contents);
  }
  return fetch(request)
    .then(ResponseParser<ItemLike>(isSuccessful, toJSON));
}

/**
 * Publishes an item.
 *
 * @param this 
 * @param publishTarget Provide defined publishTarget in URL: `trustedTesters` or `default`
 * @see https://developer.chrome.com/webstore/webstore_api/items/publish
 */
async function publishItem(this: Item, publishTarget: PublishTarget = 'default'): Promise<PublishItemResult> {
  const { access_token: token } = await refreshToken.call(this.chromeWebStore);
  const url = new URL(`${this.id}/publish`, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
  url.searchParams.set('publishTarget', publishTarget);
  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Length': 0,
      'x-goog-api-version': 2,
    },
    method: 'POST',
  });
  return fetch(request).then(ResponseParser<PublishItemResult>(isSuccessful, toJSON));
}

/**
 * Lists the in-app product information of an item.
 *
 * @param this item
 * @param gl Specifies the region code of the in-app product when `projection` is `THIN`.
 * @param hl Specifies the language code of the in-app product when `projection` is `THIN`.
 * @param projection Whether to return a subset of the result.
 * @see https://developer.chrome.com/webstore/webstore_api/inAppProducts/list
 */
async function fetchInAppProducts(this: Item, gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProductList> {
  const { access_token: token } = await refreshToken.call(this.chromeWebStore);
  const url = new URL(`${this.id}/skus`, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
  if (gl) url.searchParams.set('gl', gl);
  if (hl) url.searchParams.set('hl', hl);
  if (projection) url.searchParams.set('projection', projection);
  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-goog-api-version': 2,
    },
    method: 'GET',
  });
  return fetch(request)
    .then(ResponseParser<InAppProductList>(isSuccessful, toJSON))
    .then(inAppProductList => {
      debug(util.inspect(inAppProductList));
      return inAppProductList;
    });
}

/**
 * Gets an in-app product.
 *
 * @param this item
 * @param gl Specifies the region code of the in-app product when `projection` is `THIN`.
 * @param hl Specifies the language code of the in-app product when `projection` is `THIN`.
 * @param projection Whether to return a subset of the result.
 * @see https://developer.chrome.com/webstore/webstore_api/inAppProducts/get
 */
async function fetchInAppProduct(this: InAppProduct, gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProductLike> {
  const { access_token: token } = await refreshToken.call(this.item.chromeWebStore);
  const url = new URL(`${this.item_id}/skus/${this.sku}`, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
  if (gl) url.searchParams.set('gl', gl);
  if (hl) url.searchParams.set('hl', hl);
  if (projection) url.searchParams.set('projection', projection);
  const request = createRequest(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-goog-api-version': 2,
    },
    method: 'GET',
  });
  return fetch(request)
    .then(ResponseParser<InAppProductLike>(isSuccessful, toJSON));
}

export class InAppProduct implements InAppProductLike {
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
    public readonly localeData?: { description: string; languageCode: string; title: string }[],
    public readonly prices?: { currencyCode: string; regionCode: string; valueMicros: number }[],
  ) {
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.item_id = item.id;
  }

  public async fetch(gl?: string, hl?: string, projection?: 'ALL' | 'THIN'): Promise<InAppProduct> {
    return fetchInAppProduct.call(this, gl, hl, projection).then(this.new);
  }

  public new = (inAppProduct: InAppProductLike): InAppProduct => InAppProduct.new(this.item, inAppProduct);
}

export class Item implements ItemLike {
  public static new = (chromeWebStore: ChromeWebStoreAPI, { id, publicKey, uploadState, crxVersion, itemError }: ItemLike): Item =>
    new Item(chromeWebStore, id, publicKey, uploadState, crxVersion, itemError);

  public readonly kind = "chromewebstore#item";

  constructor(
    public readonly chromeWebStore: ChromeWebStoreAPI,
    public readonly id: string,
    public readonly publicKey?: string,
    public readonly uploadState?: string,
    public readonly crxVersion?: string,
    public readonly itemError?: ItemError[],
  ) {
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
      constructor(
        sku: string,
        type?: 'inapp' | 'subs',
        state?: 'ACTIVE' | 'INACTIVE',
        localeData?: { description: string; languageCode: string; title: string }[],
        prices?: { currencyCode: string; regionCode: string; valueMicros: number }[],
      ) {
        super(item, sku, type, state, localeData, prices);
      }
    }
  }
}

/**
 * Chrome Web Store API
 * 
 * @see https://developer.chrome.com/webstore/api_index
 */
export default class ChromeWebStoreAPI {
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
