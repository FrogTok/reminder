import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "리마인더",
    short_name: "리마인더",
    description: "매니저와 스트리머를 위한 스케줄 리마인더",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0d3a",
    theme_color: "#0a0d3a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
