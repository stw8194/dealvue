import type { Product } from "@/type/product";

type ProductInfoProps = {
  product: Product;
};

export default function ProductInfo({ product }: ProductInfoProps) {
  return (
    <section className="px-4 py-4">
      <p className="text-sm text-page-text">{product.shopName}</p>
      <h1 className="text-lg font-semibold text-page-heading">{product.name}</h1>
      <p className="mt-2 text-sm text-page-text">{product.description}</p>
      <p className="mt-2 text-lg font-semibold text-accent">
        {product.discountRate}% · {product.price.toLocaleString()}원
      </p>
    </section>
  );
}
