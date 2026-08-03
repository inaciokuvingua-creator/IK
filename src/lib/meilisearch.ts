import { Meilisearch } from "meilisearch";

export const meilisearch = new Meilisearch({
  host: import.meta.env.VITE_MEILI_URL || "http://localhost:7700",
  apiKey: import.meta.env.VITE_MEILI_KEY || "",
});