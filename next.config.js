/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Vroeger een vast bestand met de standaardiconen. Een app die toen op
      // het beginscherm is gezet, vraagt dit adres nog op voor updates; het
      // dynamische manifest geeft ook daar het eigen icoon uit /adminbackend.
      { source: "/manifest.webmanifest", destination: "/api/branding/manifest" },
    ];
  },
};

export default nextConfig;
