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

function fetch(request: ClientRequest) {
  debug(`${request.method} ${request.path} HTTP/1.1`);
  return new Promise<IncomingMessage>((resolve, reject) => {
    request.on('response', resolve).on('error', reject).end();
  });
}

function toJSON<T>(response: IncomingMessage) {
  return new Promise<T>((resolve, reject) => {
    const data: any[] = [];
    response
      .on('data', chunk => { data.push(chunk); })
      .on('end', () => {
        const body = data.reduce((text, chunk) => text + chunk.toString());
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

function isSuccessful(response: IncomingMessage) {
  return response.statusCode !== undefined && response.statusCode >= 200 && response.statusCode <= 299;
}

type ResponseConditionFunction = (response: IncomingMessage) => boolean;
type ResponseParseFunction<T> = (response: IncomingMessage) => Promise<T>;

function ResponseParser<T>(condition: ResponseConditionFunction, parse: ResponseParseFunction<T>) {
  return function parseResponse(response: IncomingMessage) {
    debug(`HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}`);
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

export type UploadType = '' | 'media';
export type PublishTarget = 'trustedTesters' | 'default';
export type Contents = string | Buffer | stream.Readable;

export interface ItemLake {
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

export abstract class Item implements ItemLake {
  public readonly kind = "chromewebstore#item";

  constructor(
    public readonly id: string,
    public readonly publicKey?: string,
    public readonly uploadState?: string,
    public readonly crxVersion?: string,
    public readonly itemError?: ItemError[],
  ) {
  }

  /**
   * Updates an existing item.
   *
   * @param contents Item
   * @param uploadType The type of upload request to the /upload URI
   * @see https://developer.chrome.com/webstore/webstore_api/items/update
   */
  public abstract upload(contents: Contents, uploadType?: UploadType): Promise<ItemLake>;

  /**
   * Publishes an item.
   *
   * @param publishTarget Provide defined publishTarget in URL: `trustedTesters` or `default`
   * @see https://developer.chrome.com/webstore/webstore_api/items/publish
   */
  public abstract publish(publishTarget?: PublishTarget): Promise<PublishItemResult>;
}

/**
 * Chrome Web Store API
 * 
 * @see https://developer.chrome.com/webstore/api_index
 */
export default class ChromeWebStoreAPI {
  private accessTokenResponse: AccessTokenResponse;
  private credential: Credential;

  constructor(credential: Credential, accessTokenResponse: AccessTokenResponse) {
    this.credential = credential;
    this.accessTokenResponse = accessTokenResponse;
  }

  private async refreshToken() {
    const url = new URL(this.credential.installed.token_uri);
    const request = createRequest(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      method: 'POST',
    });
    request.write(querystring.stringify({
      client_id: this.credential.installed.client_id,
      client_secret: this.credential.installed.client_secret,
      grant_type: 'refresh_token',
      refresh_token: this.accessTokenResponse.refresh_token,
    }));
    return Object.assign(
      this.accessTokenResponse,
      await fetch(request).then(ResponseParser<AccessTokenResponse>(isSuccessful, toJSON)),
    );
  }

  get Item() {
    const that = this;

    /**
     * Gets a Chrome Web Store item.
     *
     * @param id Unique identifier representing the Chrome App, Chrome Extension, or the Chrome Theme.
     * @param projection Determines which subset of the item information to return.
     * @see https://developer.chrome.com/webstore/webstore_api/items/get
     */
    async function fetchItem(id: string, projection: 'DRAFT' | 'PUBLISHED' = 'DRAFT') {
      const { access_token } = await that.refreshToken();
      const url = new URL(id, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
      url.searchParams.set('projection', projection);
      const request = createRequest(url, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'x-goog-api-version': 2,
        },
        method: 'GET',
      });
      return fetch(request)
        .then(ResponseParser<ItemLake>(isSuccessful, toJSON))
        .then(item => {
          debug(util.inspect(item));
          return item;
        });
    }

    return class ItemImpl extends Item {
      public static valueOf({ id, publicKey, uploadState, crxVersion, itemError }: ItemLake) {
        return new this(id, publicKey, uploadState, crxVersion, itemError);
      }

      public static async fetch(id: string) {
        return this.valueOf(await fetchItem(id));
      }

      /**
       * This method supports an upload URI and accepts uploaded media.
       *
       * @param uploadType The type of upload request to the `/upload URI.
       * @param publisherEmail The email of the publisher who owns the items.
       * @see https://developer.chrome.com/webstore/webstore_api/items/insert
       */
      public static async insert(uploadType: UploadType = 'media', publisherEmail?: string) {
        const { access_token } = await that.refreshToken();
        const url = new URL('https://www.googleapis.com/upload/chromewebstore/v1.1/items');
        url.searchParams.set('uploadType', uploadType);
        if (publisherEmail) url.searchParams.set('publisherEmail', publisherEmail);

        const request = createRequest(url, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Length': 0,
            'x-goog-api-version': 2,
          },
          method: 'POST',
        });
        return fetch(request).then(ResponseParser<ItemLake>(isSuccessful, toJSON));
      }

      public async upload(contents: Contents, uploadType: UploadType = '') {
        const { access_token } = await that.refreshToken();
        const url = new URL(this.id, 'https://www.googleapis.com/upload/chromewebstore/v1.1/items/');
        url.searchParams.set('uploadType', uploadType);
        const request = createRequest(url, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'x-goog-api-version': 2,
          },
          method: 'PUT',
        });
        if (contents instanceof stream.Readable) {
          contents.pipe(request);
        } else {
          request.write(contents);
        }
        return fetch(request).then(ResponseParser<ItemLake>(isSuccessful, toJSON));
      }

      public async publish(publishTarget: PublishTarget = 'default') {
        const { access_token } = await that.refreshToken();
        const url = new URL(`${this.id}/publish`, 'https://www.googleapis.com/chromewebstore/v1.1/items/');
        url.searchParams.set('publishTarget', publishTarget);
        const request = createRequest(url, {
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Length': 0,
            'x-goog-api-version': 2,
          },
          method: 'POST',
        });
        return fetch(request).then(ResponseParser<PublishItemResult>(isSuccessful, toJSON));
      }
    };
  }
}
