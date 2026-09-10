export type PackageCategory = "special" | "oneShop" | "shopShop";

export type SpecialPackageType = "wedding" | "photoShoot" | "exam" | "interview" | "personal";

export type ServiceCategory =
  | "hair"
  | "makeup"
  | "aesthetic"
  | "nail"
  | "eyelash";

export interface PackageItem {
  id: number;
  category: PackageCategory;
  title: string;
  thumbnail: string;
  discountRate: number;
  composedServices: string[];
}
