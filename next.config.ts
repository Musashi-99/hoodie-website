import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const stub = path.join(path.dirname(fileURLToPath(import.meta.url)), "lib/cloudflare-workers-stub.ts");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "cloudflare:workers": "./lib/cloudflare-workers-stub.ts",
    },
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "cloudflare:workers": stub,
    };
    return config;
  },
};

export default nextConfig;
