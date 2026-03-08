/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as debug from "../debug.js";
import type * as images from "../images.js";
import type * as jwt from "../jwt.js";
import type * as loginLogs from "../loginLogs.js";
import type * as logs from "../logs.js";
import type * as organizations from "../organizations.js";
import type * as patrolPoints from "../patrolPoints.js";
import type * as reports from "../reports.js";
import type * as sites from "../sites.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  debug: typeof debug;
  images: typeof images;
  jwt: typeof jwt;
  loginLogs: typeof loginLogs;
  logs: typeof logs;
  organizations: typeof organizations;
  patrolPoints: typeof patrolPoints;
  reports: typeof reports;
  sites: typeof sites;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
