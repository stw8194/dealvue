import type { PackageCategory, PackageItem, ServiceCategory } from "@/type/package";
import { axiosInstance } from "./axiosInstance";

export async function requestPackages(category: PackageCategory, serviceCategory?: ServiceCategory) {
  try {
    const { data }: { data: PackageItem[] } = await axiosInstance.get("packages", {
      params: { category, serviceCategory },
    });
    return data;
  } catch (err) {
    console.error(err);
  }
}

export async function requestPackageDetail(packageId: number) {
  try {
    const { data }: { data: PackageItem } = await axiosInstance.get(`packages/${packageId}`);
    return data;
  } catch (err) {
    console.error(err);
  }
}
