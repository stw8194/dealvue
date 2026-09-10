import { useEffect, useState } from "react";
import { requestMyReviews } from "@/api/mypage";
import type { Review } from "@/type/product";

export default function ReviewList() {
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    requestMyReviews().then(data => {
      if (data) setReviews(data);
    });
  }, []);

  return (
    <ul className="flex flex-col gap-3 px-4 py-4">
      {reviews.map(review => (
        <li key={review.id} className="border-b border-page-border pb-3">
          <p className="text-sm text-page-text">★ {review.rating}</p>
          <p className="text-sm text-page-heading">{review.content}</p>
        </li>
      ))}
    </ul>
  );
}
