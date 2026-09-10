import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import { requestPackageDetail } from "@/api/package";
import type { PackageItem } from "@/type/package";

export default function PackageDetail() {
  const { packageId } = useParams<{ packageId: string }>();
  const [packageItem, setPackageItem] = useState<PackageItem | null>(null);

  useEffect(() => {
    if (!packageId) return;
    requestPackageDetail(Number(packageId)).then(data => {
      if (data) setPackageItem(data);
    });
  }, [packageId]);

  if (!packageItem) return null;

  return (
    <main className="pb-16">
      <Header title={packageItem.title} />
      <img src={packageItem.thumbnail} alt={packageItem.title} className="aspect-square w-full object-cover" />
      <section className="px-4 py-4">
        <p className="text-lg font-semibold text-accent">최대 {packageItem.discountRate}% 할인</p>
        <p className="mt-2 text-sm text-page-text">{packageItem.composedServices.join(" + ")}</p>
      </section>
    </main>
  );
}
