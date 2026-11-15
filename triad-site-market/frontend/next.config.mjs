/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  // /api/* is proxied to the backend at runtime by app/api/[...path]/route.ts (TRIAD_API_URL).
};
