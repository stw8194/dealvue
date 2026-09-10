import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import ProductInfo from "@/components/product/ProductInfo";
import LiveViewerBadge from "@/components/product/LiveViewerBadge";
import ReviewSection from "@/components/product/ReviewSection";
import CartButton from "@/components/product/CartButton";
import { requestProduct } from "@/api/product";
import type { Product } from "@/type/product";

export default function ProductDetail() {
  const { productId } = useParams<{ productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (!productId) return;
    requestProduct(Number(productId)).then(data => {
      if (data) setProduct(data);
    });
  }, [productId]);

  if (!product) return null;

  return (
    <main className="pb-24">
      <Header title={product.name} />
      <img src={product.bannerImages[0]} alt={product.name} className="aspect-square w-full object-cover" />
      <ProductInfo product={product} />
      <LiveViewerBadge count={product.viewerCount} />
      <ReviewSection productId={product.id} />
      <div className="fixed inset-x-0 bottom-16 border-t border-page-border bg-page-background px-4 py-3">
        <CartButton productId={product.id} />
      </div>
    </main>
  );
}
