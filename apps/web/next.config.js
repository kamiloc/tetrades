/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@packages/validators',
    '@packages/shared-logic',
    '@packages/auth',
  ],
};

export default nextConfig;
