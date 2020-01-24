# chrome-web-store-api

[![npm version](https://badge.fury.io/js/chrome-web-store-api.svg)](https://badge.fury.io/js/chrome-web-store-api) [![Build Status](https://travis-ci.org/naokikimura/chrome-web-store-api.svg?branch=master)](https://travis-ci.org/naokikimura/chrome-web-store-api) [![Known Vulnerabilities](https://snyk.io/test/github/naokikimura/chrome-web-store-api/badge.svg?targetFile=package.json)](https://snyk.io/test/github/naokikimura/chrome-web-store-api?targetFile=package.json)

[Chrome Web Store API](https://developer.chrome.com/webstore/api_index) client for Node.js

## Installation

```sh
npm install chrome-web-store-api
```

## Configuration

Refer to [this page](https://developer.chrome.com/webstore/using_webstore_api) to get the response of credentials and access token.

Set that value in an environment variable.
- `CHROME_WEB_STORE_API_CREDENTIAL`
- `CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE`

For example:
```sh
export CHROME_WEB_STORE_API_CREDENTIAL=$( cat <<EOF | tr -d ' \r\n'
{
  "installed": {
    "client_id": "999999999999-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
    "project_id": "foo-bar-baz",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "abcdefghijklmnopqrstuvwx",
    "redirect_uris": [
      "urn:ietf:wg:oauth:2.0:oob",
      "http://localhost"
    ]
  }
}
EOF
)

export CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE=$(cat <<EOF | tr -d ' \r\n'
{
  "access_token": "vpvEyHWpX^{CQC`fREmnwCHb`ejN`ox^XxEbYDKXmghM`]lrL{ddTrxdgtgLEvAeX\oP]NkRgjFcvNE_enJZI`BNcvZScQOA\BAA|NSzB_Xg_ie_yXLrQ[sII_]r|jW{nzZULNP",
  "expires_in": 3599,
  "refresh_token": "riM{R[Lir|hyHT|DNeWZhQzVpOjvTbTMayHZdfNFlR{TB]KFSh^DyjNZySyj|aWYajb]dNCIRTZXmKKuB`bbUyoLRGkPWao|pibdNSk",
  "scope": "https://www.googleapis.com/auth/chromewebstore",
  "token_type": "Bearer"
}
EOF
)
```

# Usage

For example:

```js
const ChromeWebStoreAPI = require('chrome-web-store-api');
const fs = require('fs');

const chromeWebStoreAPI = new ChromeWebStoreAPI(
    JSON.parse(process.env.CHROME_WEB_STORE_API_CREDENTIAL || ''),
    JSON.parse(process.env.CHROME_WEB_STORE_API_ACCESS_TOKEN_RESPONSE || ''),
);
const itemId = 'ID of your Chrome extension';
chromeWebStoreAPI.Item.fetch(itemId)
    .then(item => {
        const readStream = fs.createReadStream('your-chrome-extension.zip');
        return item.upload(readStream);
    })
    .then(result => {
        if (result.uploadState === 'FAILURE') {
            const message = (result.itemError || []).map(error => error.error_detail).join('\n');
            throw new Error(message);
        }
        console.log('Upload succeeded.');
        return chromeWebStoreAPI.Item.valuOf(result);
    })
    .then(item => {
        return item.publish();
    })
    .then(result => {
        (result.statusDetail || []).forEach(detail => console.log(detail));
    })
    .catch(console.error);
```

## Contributing
Bug reports and pull requests are welcome on GitHub at https://github.com/naokikimura/chrome-web-store-api

## License
The gem is available as open source under the terms of the [MIT License](https://opensource.org/licenses/MIT).