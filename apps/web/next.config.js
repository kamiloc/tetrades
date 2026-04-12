/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@packages/validators',
    '@packages/shared-logic',
    '@packages/api-client',
    '@packages/auth',
  ],
};

export default nextConfig;
