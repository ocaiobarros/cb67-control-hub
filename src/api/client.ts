import { env } from "@/config/env";
import { mockAdapter } from "@/mocks/adapter";
import { httpAdapter } from "./http-adapter";
import type { PlatformAdapter } from "./adapter";

/**
 * Single entry point for every backend interaction.
 *
 * Mock mode is controlled by VITE_USE_MOCK_API (defaults to true).
 * To go live: set VITE_USE_MOCK_API=false and VITE_CB67_API_BASE_URL.
 */
export const api: PlatformAdapter = env.useMockApi ? mockAdapter : httpAdapter;

export const isMockMode = api.kind === "mock";
