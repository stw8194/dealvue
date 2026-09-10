import { useEffect, useState } from "react";
import { requestProductReviews } from "@/api/product";
import type { Review } from "@/type/product";

type ReviewSectionProps = {
  productId: number;
};

export default function ReviewSection({ productId }: ReviewSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    requestProductReviews(productId).then(data => {
      if (data) setReviews(data);
    });
  }, [productId]);

  return (
    <section className="px-4 py-4">
      <h2 className="text-base font-semibold text-page-heading">리뷰</h2>
      <ul className="mt-2 flex flex-col gap-3">
        {reviews.map(review => (
          <li key={review.id} className="border-b border-page-border pb-3">
            <p className="text-sm font-semibold text-page-heading">{review.userNickname}</p>
            <p className="text-sm text-page-text">★ {review.rating}</p>
            <p className="text-sm text-page-text">{review.content}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
