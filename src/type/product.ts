export interface Product {
  id: number;
  name: string;
  description: string;
  bannerImages: string[];
  price: number;
  discountRate: number;
  viewerCount: number;
  shopId: number;
  shopName: string;
}

export interface Review {
  id: number;
  productId: number;
  userNickname: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: string;
}
