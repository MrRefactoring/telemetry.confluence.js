import { Authentication } from './authentication';

export interface Telemetry {
  libVersion: string,
  libVersionHash: string,
  methodName: string,
  authentication: Authentication,
  baseRequestConfigUsed: boolean,
  onResponseMiddlewareUsed: boolean,
  onErrorMiddlewareUsed: boolean,
  callbackUsed: boolean,
  queryExists: boolean,
  bodyExists: boolean,
  headersExists: boolean,
  requestStatusCode: number,
  requestStartTime: Date,
  requestEndTime: Date,
  noCheckAtlassianToken?: boolean;
}
