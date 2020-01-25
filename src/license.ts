import { LicenseLike, fetchLicense } from './chrome-web-store-api';
import ChromeWebStore from './chrome-web-store';

export default class License implements LicenseLike {
  public readonly kind = 'chromewebstore#license';
  public readonly id: string;

  constructor(
    public readonly chromeWebStore: ChromeWebStore,
    public readonly appId: string,
    public readonly userId: string,
    public readonly result?: 'NO' | 'YES',
    public readonly accessLevel?: 'FREE_TRIAL' | 'FULL',
    public readonly maxAgeSecs?: number,
  ) {
    this.id = `${appId}/${userId}`;
  }

  public new = ({ appId, userId, result, accessLevel, maxAgeSecs }: LicenseLike): License =>
    new License(this.chromeWebStore, appId, userId, result, accessLevel, maxAgeSecs);

  public fetch(): Promise<License> {
    return fetchLicense.call(this).then(this.new);
  }
}
