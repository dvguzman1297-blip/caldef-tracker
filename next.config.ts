import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the Android emulator (which reaches the host as 10.0.2.2) load `next dev`.
  allowedDevOrigins: ["10.0.2.2"],
};

export default nextConfig;
