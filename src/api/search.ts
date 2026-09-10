import type { PopularSearchKeyword } from "@/type/home";
import { axiosInstance } from "./axiosInstance";

export async function requestSearchRanking() {
  try {
    const { data }: { data: PopularSearchKeyword[] } = await axiosInstance.get("search/ranking");
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestSearchResults(keyword: string) {
  try {
    const { data } = await axiosInstance.get("search", { params: { keyword } });
    return data;
  } catch (err) {
    console.error(err);
  }
}
