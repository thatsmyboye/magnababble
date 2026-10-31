import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Local UI testing without Supabase also swaps Realtime reactions for a
  // browser-native broadcast channel (see lib/realtime/reactions.ts).
  env: { NEXT_PUBLIC_MAGNA_FAKE_REALTIME: process.env.MAGNA_FAKE_DB ? "1" : "" },
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
