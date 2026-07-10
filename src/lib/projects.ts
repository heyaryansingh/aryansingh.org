/**
 * projects.ts — portfolio helpers over the `projects` content collection.
 * Single source of truth for category labels/icons/colors + sorting.
 */
import { getCollection, type CollectionEntry } from "astro:content";

export type ProjectCategory =
  | "ai"
  | "quantum"
  | "biotech"
  | "trading"
  | "devtools"
  | "automation";

export interface CategoryMeta {
  label: string;
  icon: string;
  color: string;
}

export const CATEGORY_META: Record<ProjectCategory, CategoryMeta> = {
  ai: { label: "AI & ML", icon: "🧠", color: "var(--color-accent-primary)" },
  quantum: { label: "Quantum", icon: "⚛️", color: "#7B8FE8" },
  biotech: { label: "Biotech & Health", icon: "🧬", color: "#4A9F6E" },
  trading: { label: "Trading & Quant", icon: "📈", color: "#D4A84A" },
  devtools: { label: "Dev Tools", icon: "🛠️", color: "#6B7FD4" },
  automation: { label: "Automation", icon: "⚡", color: "#C77DD4" },
};

export const CATEGORY_ORDER: ProjectCategory[] = [
  "ai",
  "quantum",
  "biotech",
  "trading",
  "devtools",
  "automation",
];

export const STATUS_META: Record<string, { label: string; color: string }> = {
  active: { label: "Active", color: "#4A9F6E" },
  research: { label: "Research", color: "#6B7FD4" },
  complete: { label: "Complete", color: "#9898A0" },
};

export type ProjectEntry = CollectionEntry<"projects">;

/** All projects sorted: pinned first, then `order`, then newest start date. */
export async function getSortedProjects(): Promise<ProjectEntry[]> {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => {
    if (a.data.pinned !== b.data.pinned) return a.data.pinned ? -1 : 1;
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    const ad = a.data.startDate?.getTime() ?? 0;
    const bd = b.data.startDate?.getTime() ?? 0;
    return bd - ad;
  });
}

/** Categories that actually have projects, in canonical order. */
export function usedCategories(projects: ProjectEntry[]): ProjectCategory[] {
  const present = new Set(projects.map((p) => p.data.category));
  return CATEGORY_ORDER.filter((c) => present.has(c));
}
