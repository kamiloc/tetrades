import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../..'),
  transpilePackages: [
    '@packages/validators',
    '@packages/shared-logic',
    '@packages/auth',
  ],
};

export default nextConfig;
