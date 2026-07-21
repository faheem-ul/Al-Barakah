import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "@/lib/firebase";

export type ReviewStatus = "pending" | "approved" | "rejected";

export type ReviewPayload = {
  name: string;
  email: string;
  message: string;
  rating: number;
  productId?: string;
  productName?: string;
  createdAt?: number;
  status?: ReviewStatus;
};

export type Review = ReviewPayload & { id: string; status: ReviewStatus };

function normalizeStatus(status?: ReviewStatus | string): ReviewStatus {
  if (status === "pending" || status === "rejected" || status === "approved") {
    return status;
  }
  return "pending";
}

function mapReview(
  id: string,
  data: Partial<ReviewPayload>,
): Review {
  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    message: data.message ?? "",
    rating: data.rating ?? 0,
    productId: data.productId,
    productName: data.productName ?? "",
    createdAt: data.createdAt ?? Date.now(),
    status: normalizeStatus(data.status),
  };
}

export async function createReview(payload: ReviewPayload) {
  const docRef = await addDoc(collection(db, "reviews"), {
    name: payload.name,
    email: payload.email,
    message: payload.message,
    rating: payload.rating,
    productId: payload.productId,
    productName: payload.productName,
    status: "pending" as ReviewStatus,
    createdAt: payload.createdAt ?? Date.now(),
  });
  return docRef.id;
}

/** Storefront: only reviews with status === "approved". */
export async function getReviews(productId?: string): Promise<Review[]> {
  const base = collection(db, "reviews");
  // Avoid composite index by not combining where + orderBy across different fields.
  const q = productId
    ? query(base, where("productId", "==", productId))
    : query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const approved = snap.docs
    .map((d) => mapReview(d.id, d.data() as Partial<ReviewPayload>))
    .filter((r) => r.status === "approved");

  if (productId) {
    approved.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
  return approved;
}

/** Admin: all reviews, newest first. */
export async function getAllReviews(): Promise<Review[]> {
  const base = collection(db, "reviews");
  const q = query(base, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) =>
    mapReview(d.id, d.data() as Partial<ReviewPayload>),
  );
  return rows;
}

/** Admin: update a review status. */
export async function updateReviewStatus(
  id: string,
  status: ReviewStatus,
): Promise<void> {
  await updateDoc(doc(db, "reviews", id), { status });
}

/** Admin: delete a review. */
export async function deleteReview(id: string): Promise<void> {
  await deleteDoc(doc(db, "reviews", id));
}
