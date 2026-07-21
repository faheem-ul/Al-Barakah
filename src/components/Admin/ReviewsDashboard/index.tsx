"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { useAdminAuth } from "@/components/Admin/AdminAuthProvider";
import {
  deleteReview,
  getAllReviews,
  Review,
  ReviewStatus,
  updateReviewStatus,
} from "@/lib/reviews";
import { ADMIN_PRODUCTS, numericProductId } from "@/lib/admin-products";

import { FilterTab, ProductFilter } from "./constants";
import ProductSidebar from "./ProductSidebar";
import ProductSheet from "./ProductSheet";
import StatusSheet from "./StatusSheet";
import DashboardHeader from "./DashboardHeader";
import StatusFilters from "./StatusFilters";
import ReviewList from "./ReviewList";

const ReviewsDashboard: React.FC = () => {
  const { user, logout } = useAdminAuth();
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getAllReviews();
      setItems(rows);
    } catch (e) {
      console.error("Failed to load reviews", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of ADMIN_PRODUCTS) counts.set(p.id, 0);
    for (const r of items) {
      const id = numericProductId(r.productId);
      if (counts.has(id)) counts.set(id, (counts.get(id) || 0) + 1);
    }
    return counts;
  }, [items]);

  const productScopedItems = useMemo(() => {
    if (productFilter === "all") return items;
    return items.filter(
      (r) => numericProductId(r.productId) === productFilter,
    );
  }, [items, productFilter]);

  const statusCounts = useMemo(() => {
    const counts = {
      all: productScopedItems.length,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    for (const r of productScopedItems) {
      if (r.status === "pending") counts.pending += 1;
      else if (r.status === "approved") counts.approved += 1;
      else if (r.status === "rejected") counts.rejected += 1;
    }
    return counts;
  }, [productScopedItems]);

  const filtered = useMemo(() => {
    if (filter === "all") return productScopedItems;
    return productScopedItems.filter((r) => r.status === filter);
  }, [productScopedItems, filter]);

  const selectProduct = (id: ProductFilter) => {
    setProductFilter(id);
    setProductSheetOpen(false);
  };

  const selectStatus = (id: FilterTab) => {
    setFilter(id);
    setStatusSheetOpen(false);
  };

  const setStatus = async (id: string, status: ReviewStatus) => {
    setBusyId(id);
    try {
      await updateReviewStatus(id, status);
      setItems((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
    } catch (e) {
      console.error("Failed to update review", e);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this review permanently?")) return;
    setBusyId(id);
    try {
      await deleteReview(id);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Failed to delete review", e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-screen bg-[#F7F7F7] flex overflow-hidden">
      {/* Product Sidebar */}
      <ProductSidebar
        productFilter={productFilter}
        totalCount={items.length}
        productCounts={productCounts}
        onSelect={selectProduct}
      />

      {/* Product Sheet Mobile */}
      <ProductSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        productFilter={productFilter}
        totalCount={items.length}
        productCounts={productCounts}
        onSelect={selectProduct}
        onLogout={logout}
      />

      {/* Status Sheet Mobile */}
      <StatusSheet
        open={statusSheetOpen}
        onOpenChange={setStatusSheetOpen}
        filter={filter}
        statusCounts={statusCounts}
        onSelect={selectStatus}
      />

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <DashboardHeader
          email={user?.email}
          onOpenProducts={() => setProductSheetOpen(true)}
          onLogout={logout}
        />

        <main className="flex-1 min-h-0 overflow-y-auto px-4 md:px-8 py-6 md:py-8">
          <div className="max-w-5xl mx-auto w-full">
            <StatusFilters
              filter={filter}
              statusCounts={statusCounts}
              onFilterChange={setFilter}
              onOpenStatusSheet={() => setStatusSheetOpen(true)}
            />

            <ReviewList
              loading={loading}
              reviews={filtered}
              busyId={busyId}
              onApprove={(id) => setStatus(id, "approved")}
              onReject={(id) => setStatus(id, "rejected")}
              onDelete={handleDelete}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReviewsDashboard;
