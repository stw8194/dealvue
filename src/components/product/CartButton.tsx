import { requestAddToCart } from "@/api/product";
import Button from "@/components/common/Button";

type CartButtonProps = {
  productId: number;
};

export default function CartButton({ productId }: CartButtonProps) {
  return (
    <Button onClick={() => requestAddToCart(productId)} className="w-full">
      장바구니 담기
    </Button>
  );
}
