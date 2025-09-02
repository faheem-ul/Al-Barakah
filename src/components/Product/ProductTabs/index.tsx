"use client";

import React, { useState } from "react";
import { Product } from "@/lib/shopify/types";
import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";

interface ProductTabsProps {
    product: Product;
}

type TabType = "description" | "reviews";

const ProductTabs: React.FC<ProductTabsProps> = ({ product }) => {
    const [activeTab, setActiveTab] = useState<TabType>("description");
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [rating, setRating] = useState(3);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
        saveInfo: true,
    });

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
    };

    const handleRatingChange = (newRating: number) => {
        setRating(newRating);
    };

    const handleInputChange = (field: string, value: string | boolean) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically submit the review to your backend
        console.log("Review submitted:", { rating, ...formData });
        setShowSuccessMessage(true);
        // Reset form after submission
        setTimeout(() => {
            setShowSuccessMessage(false);
            setFormData({
                name: "",
                email: "",
                message: "",
                saveInfo: true,
            });
            setRating(3);
        }, 3000);
    };

    const renderStars = (currentRating: number, interactive = false) => {
        return (
            <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type={interactive ? "button" : "button"}
                        onClick={() => interactive && handleRatingChange(star)}
                        className={`text-xl ${star <= currentRating
                            ? "text-yellow-400"
                            : "text-gray-400"
                            } ${interactive ? "hover:text-yellow-300" : ""}`}
                        disabled={!interactive}
                    >
                        ★
                    </button>
                ))}
                {interactive && (
                    <span className="ml-2 text-sm text-gray-300">{rating}.0</span>
                )}
            </div>
        );
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
            {showSuccessMessage && (
                <div className="bg-[#302A25] text-white p-4 rounded-lg flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                    </div>
                    <Text className="text-white">{`Your Review Has Been Submitted`}</Text>
                </div>
            )}

            <div className="space-y-2">
                <h3 className="text-[20px] font-semibold text-white">
                    {`Be The First To Review Organic Honey`}
                </h3>
                <Text className="text-[18px] text-white">
                    {`Your e-mail address will not be published. Required field are marked.`}
                </Text>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-6">
                <div className="flex items-center gap-2">
                    <Text className="text-[18px] font-medium text-white">Your Rating</Text>
                    {renderStars(rating, true)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                        type="text"
                        placeholder="Name"
                        value={formData.name}
                        onChange={(e) => handleInputChange("name", e.target.value)}
                        className="w-full px-4 py-3 h-[55px] bg-white text-gray-800 rounded-[15px] border-none outline-none focus:outline-none"
                        required
                    />
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={formData.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="w-full px-4 py-3 h-[55px] bg-white text-gray-800 rounded-[15px] border-none focus:outline-none"
                        required
                    />
                </div>

                <textarea
                    placeholder="Your Message"
                    value={formData.message}
                    onChange={(e) => handleInputChange("message", e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3  bg-white text-gray-800 rounded-[15px] border-none focus:outline-none resize-none"
                    required
                />

                <div className="flex items-center gap-3">
                    <input
                        type="checkbox"
                        id="saveInfo"
                        checked={formData.saveInfo}
                        onChange={(e) => handleInputChange("saveInfo", e.target.checked)}
                        className="w-4 h-4 text-amber-600 bg-gray-700 border-gray-600 rounded focus:ring-amber-500 focus:ring-2"
                    />
                    <label htmlFor="saveInfo" className="text-sm text-gray-400">
                        Save my name, e-mail address, and website in this browser for next time I comment.
                    </label>
                </div>

                <Button
                    type="submit"
                    className="bg-white text-black text-[20px] font-semibold w-[142px] h-[55px] py-3 flex justify-center rounded-lg hover:bg-gray-100 transition-colors"
                >
                    Submit
                </Button>
            </form>
        </div>
    );

    return (
        <div className="bg-[#36454F] py-12 mt-10">
            <div className="max-w-4xl mx-auto px-6">
                {/* Tab Navigation */}
                <div className="flex justify-center mb-12">
                    <div className="flex space-x-8">
                        <button
                            onClick={() => handleTabChange("description")}
                            className={`pb-2 border-b-2 text-[24px] font-semibold transition-colors cursor-pointer ${activeTab === "description"
                                ? "text-white border-white"
                                : "text-white border-transparent"
                                }`}
                        >
                            <Text className="font-medium">Description</Text>
                        </button>
                        <button
                            onClick={() => handleTabChange("reviews")}
                            className={`pb-2 border-b-2 text-[24px] font-semibold transition-colors cursor-pointer ${activeTab === "reviews"
                                ? "text-white border-white"
                                : "text-white border-transparent"
                                }`}
                        >
                            <Text className="font-medium">Reviews (0)</Text>
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="">
                    {activeTab === "description" && renderDescriptionContent()}
                    {activeTab === "reviews" && renderReviewsContent()}
                </div>
            </div>
        </div>
    );
};

export default ProductTabs;
