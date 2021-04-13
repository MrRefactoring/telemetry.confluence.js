import fetch from 'node-fetch';
import { TelemetryConfig } from './telemetryConfig';
import { Telemetry } from './telemetry';
import { version, endpoint, hash } from './sensitiveInformation.json';

interface TelemetryMetadata {
  telemetryClientVersion: string;
  telemetryClientVersionHash: string;
  timeDifference: number | null;
}

interface ServerTime {
  abbreviation: 'UTC';
  client_ip: string;
  datetime: string;
}

type TelemetryBody = Partial<Telemetry> & TelemetryMetadata;

const timeOffsetEndpoint = 'https://worldtimeapi.org/api/timezone/Etc/UTC';

export class TelemetryClient {
  private static timeDifference?: number | null;
  private static timeDifferenceRequest?: Promise<Date | null>;

  private readonly config: boolean | TelemetryConfig;
  private queue: TelemetryBody[] = [];
  private debounce?: NodeJS.Timeout;

  constructor(config?: boolean | TelemetryConfig) {
    this.config = config ?? true;
  }

  async sendTelemetry(telemetry: Telemetry) {
    try {
      const preparedTelemetry = this.prepareTelemetry(telemetry);

      if (Object.keys(preparedTelemetry).length === 0) {
        return;
      }

      this.debounce && clearTimeout(this.debounce);
      this.setDebounce();

      const timeDifference = await this.getTimeDifference();

      const data: TelemetryBody = {
        ...preparedTelemetry,
        telemetryClientVersion: version,
        telemetryClientVersionHash: hash,
        timeDifference,
      };

      this.queue.push(data);
    } catch {
      // ignore
    }
  }

  private async sendBulk() {
    try {
      if (this.queue.length) {
        await fetch(`${endpoint}/telemetry`, {
          body: JSON.stringify(this.queue),
          method: 'POST',
          compress: true,
          follow: 0,
        });

        this.queue.length = 0;
      }
    } catch (e) {
      // ignore
    }
  }

  private prepareTelemetry(rawTelemetry: Telemetry) {
    if (typeof this.config === 'boolean') {
      return this.config ? rawTelemetry : {};
    }

    if (Object.keys(this.config).length === 0) {
      return {};
    }

    const mappedConfig: Record<keyof Telemetry, boolean> = {
      libVersion: true,
      libVersionHash: true,
      methodName: true,
      authentication: this.config.allowedToPassAuthenticationType ?? true,
      baseRequestConfigUsed: true,
      onResponseMiddlewareUsed: true,
      onErrorMiddlewareUsed: true,
      callbackUsed: true,
      queryExists: true,
      bodyExists: true,
      headersExists: true,
      requestStatusCode: this.config.allowedToPassRequestStatusCode ?? true,
      requestStartTime: this.config.allowedToPassRequestTimings ?? true,
      requestEndTime: this.config.allowedToPassRequestTimings ?? true,
      noCheckAtlassianToken: true,
    };

    const preparedTelemetry: Partial<Telemetry> = {};

    const entries = Object.entries(mappedConfig) as unknown as [keyof Telemetry, boolean][];

    entries.forEach(([key, allowed]) => {
      if (allowed) {
        // @ts-ignore
        preparedTelemetry[key] = rawTelemetry[key];
      }
    });

    return preparedTelemetry;
  }

  private async getTimeDifference() {
    if (TelemetryClient.timeDifference !== undefined) {
      return TelemetryClient.timeDifference;
    }

    TelemetryClient.timeDifferenceRequest = TelemetryClient.timeDifferenceRequest
      || fetch(timeOffsetEndpoint)
        .then((response): Promise<ServerTime> => response.json())
        .then(({ datetime }) => new Date(datetime))
        .catch(() => null);

    const serverTime = await TelemetryClient.timeDifferenceRequest;

    const now = new Date();

    TelemetryClient.timeDifference = serverTime
      ? Math.floor((serverTime.getTime() - now.getTime()) / 1000)
      : null;

    return TelemetryClient.timeDifference;
  }

  private setDebounce() {
    this.debounce = setTimeout(() => this.sendBulk(), 10_000);
  }
}
