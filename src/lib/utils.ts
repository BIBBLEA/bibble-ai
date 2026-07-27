import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export from centralized config
export { MAX_SCRIPT_CHARACTERS, MAX_SCRIPT_WORDS } from "@/lib/heygen-config";

export const VIDEO_FORMATS = [
  { id: "9:16" as const, label: "9:16", description: "TikTok, Shorts, Reels" },
  { id: "16:9" as const, label: "16:9", description: "YouTube, Facebook Ads" },
];
