import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  webpack: (config, { webpack }) => {
    // Local UI testing without Supabase: swap the service client for the
    // Postgres-backed test double. Never set in production.
    if (process.env.MAGNA_FAKE_DB) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /lib[\\/]supabase[\\/]service$/,
          path.resolve(__dirname, "test/integration/service-fake.ts")
        )
      );
    }
    return config;
  },
};

export default nextConfig;
