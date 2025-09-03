"use client";

import React, { useState } from "react";
import { Product } from "@/lib/shopify/types";
import Text from "@/components/ui/Text";

import ReviewsForm from "./ReviewsForm";

interface ProductTabsProps {
  product: Product;
}

type TabType = "description" | "addReview";

const ProductTabs: React.FC<ProductTabsProps> = ({ product }) => {
  const [activeTab, setActiveTab] = useState<TabType>("description");

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const renderDescriptionContent = () => (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h3 className="text-[20px] font-medium text-white">
          Healing Power Of Honey
        </h3>
        <Text className="max-w-[1117px] w-full mx-auto text-[18px] text-white/80 font-light leading-relaxed">
          {` Honey Is One Of Nature's Most Precious Gifts, Packed With Essential Minerals, 
                    Vitamins, And Antioxidants. It Strengthens The Immune System, Improves Liver Function, 
                    Sharpens Memory, Boosts Vitality, And Even Helps Prevent Major Illnesses. From Relieving
                     Constipation And Cough To Breaking Kidney Stones And Healing Wounds, Honey Is A Natural 
                     Remedy For Over 70 Diseases Without Any Side Effects.`}
        </Text>
      </div>

      <div className="space-y-2">
        <h3 className="text-[20px] font-medium text-white">
          Daily Health Benefits
        </h3>
        <Text className="max-w-[1117px] w-full mx-auto text-[18px] text-white/80 font-light leading-relaxed">
          {`Regular Use Of Honey Not Only Enhances Energy And Vision But Also Protects The Heart, Controls Harmful Cholesterol, And Supports Overall Wellness. Especially Beneficial For Children, The Elderly, And Even Diabetic Patients (With Berry Honey Being Most Effective), Honey Is Truly A Complete Tonic For A Healthy Life.`}
        </Text>
      </div>
    </div>
  );

  const renderReviewsContent = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-[20px] font-semibold text-white">{`Be The First To Review Organic Honey`}</h3>
        <Text className="text-[18px] text-white">{`Your e-mail address will not be published. Required field are marked.`}</Text>
      </div>
      <ReviewsForm productId={product?.id} />
      {/* <ReviewsList productId={product?.id} /> */}
    </div>
  );

  return (
    <div className="bg-[#000] py-12 mt-10">
      <div className="max-w-4xl mx-auto px-6">
        {/* Tab Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex space-x-8">
            <button
              onClick={() => handleTabChange("description")}
              className={`pb-2 border-b-2 text-[24px] font-semibold transition-colors cursor-pointer ${
                activeTab === "description"
                  ? "text-white border-white"
                  : "text-white border-transparent"
              }`}
            >
              <Text className="font-medium">Description</Text>
            </button>
            <button
              onClick={() => handleTabChange("addReview")}
              className={`pb-2 border-b-2 text-[24px] font-semibold transition-colors cursor-pointer ${
                activeTab === "addReview"
                  ? "text-white border-white"
                  : "text-white border-transparent"
              }`}
            >
              <Text className="font-medium">Add a Review</Text>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="">
          {activeTab === "description" && renderDescriptionContent()}
          {activeTab === "addReview" && renderReviewsContent()}
        </div>
      </div>
    </div>
  );
};

export default ProductTabs;
