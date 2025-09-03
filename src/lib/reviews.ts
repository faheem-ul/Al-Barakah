import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
} from "@/lib/firebase";

export type ReviewPayload = {
  name: string;
  email: string;
  message: string;
  rating: number;
  productId?: string;
  createdAt?: number;
};

export type Review = ReviewPayload & { id: string };

export async function createReview(payload: ReviewPayload) {
  const docRef = await addDoc(collection(db, "reviews"), {
    ...payload,
    createdAt: payload.createdAt ?? Date.now(),
  });
  return docRef.id;
}

export async function getReviews(productId?: string): Promise<Review[]> {
  const base = collection(db, "reviews");
  // Avoid composite index by not combining where + orderBy across different fields.
  const q = productId
    ? query(base, where("productId", "==", productId))
    : query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const rows: Review[] = snap.docs.map((d) => {
    const data = d.data() as Partial<ReviewPayload>;
    return {
      id: d.id,
      name: data.name ?? "",
      email: data.email ?? "",
      message: data.message ?? "",
      rating: data.rating ?? 0,
      productId: data.productId,
      createdAt: data.createdAt ?? Date.now(),
    };
  });
  if (productId) {
    rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return rows;
}
