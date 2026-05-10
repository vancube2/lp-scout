/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Wallet adapters depend on `window` being present during module load
    // Mark them as external on server to prevent SSR issues
    if (isServer) {
      config.externals.push(
        '@solana/wallet-adapter-phantom',
        '@solana/wallet-adapter-solflare',
        '@solana/wallet-adapter-react',
        '@solana/wallet-adapter-react-ui'
      );
    }
    return config;
  },
  // Ensure proper transpilation of wallet adapter packages
  transpilePackages: [
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-phantom',
    '@solana/wallet-adapter-solflare',
  ],
};

module.exports = nextConfig;
