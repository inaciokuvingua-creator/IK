import { MeiliSearch } from "meilisearch";

export const meilisearch = new MeiliSearch({
  host: import.meta.env.VITE_MEILI_URL || "http://localhost:7700",
  apiKey: import.meta.env.VITE_MEILI_KEY || "",
});