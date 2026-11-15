/** @type {import('next').NextConfig} */
const API = process.env.TRIAD_API_URL || "http://localhost:8000";
export default {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};
