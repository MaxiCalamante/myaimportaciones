export interface ProductReview {
  id: string;
  author: string;
  location: string;
  rating: number;
  date: string;
  verifiedPurchase: boolean;
  title: string;
  comment: string;
  likes: number;
  verifiedDestination?: string;
}

export interface ProductRatingSummary {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { 5: number; 4: number; 3: number; 2: number; 1: number };
  recommendationPercentage: number;
}

/** No reviews are published until there is a persistent, verified customer source. */
export function getProductReviews(_product: { id?: string; slug?: string; title: string; categoryName?: string; brand?: string }): { reviews: ProductReview[]; summary: ProductRatingSummary } {
  void _product;
  return {
    reviews: [],
    summary: { averageRating: 0, totalReviews: 0, ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, recommendationPercentage: 0 },
  };
}
