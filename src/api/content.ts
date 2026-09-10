import type { ContentItem } from "@/type/content";
import { axiosInstance } from "./axiosInstance";

export async function requestContents() {
  try {
    const { data }: { data: ContentItem[] } = await axiosInstance.get("contents");
    return data;
  } catch (err) {
    console.error(err);
  }
}
