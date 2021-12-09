import { TelemetryConfig } from './telemetryConfig';
import { Telemetry } from './telemetry';

export class TelemetryClient {
  constructor(_config?: boolean | TelemetryConfig) {
    // ignore
  }

  async sendTelemetry(_telemetry: Telemetry) {
    // ignore
  }
}
