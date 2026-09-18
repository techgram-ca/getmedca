import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GetMed Driver",
    short_name: "GetMed",
    description: "Deliveries for GetMed drivers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f8",
    theme_color: "#0f7a73",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
