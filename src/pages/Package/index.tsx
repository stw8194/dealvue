import { DealKitList } from "@/features/consumer/discovery/PackagePages";
import Header from "@/components/layout/Header";

export default function PackageHome() {
  return (
    <main className="pb-16">
      <Header title="딜키트" />
      <section className="px-4 py-4"><DealKitList /></section>
    </main>
  );
}
