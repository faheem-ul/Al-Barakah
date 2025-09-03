"use client";
import React, { useState } from "react";
import Text from "@/components/ui/Text";
import { Button } from "@/components/ui/button";
import { createReview } from "@/lib/reviews";

type ReviewsFormProps = {
  productId?: string;
  onSubmitted?: () => void;
};

const ReviewsForm: React.FC<ReviewsFormProps> = ({
  productId,
  onSubmitted,
}) => {
  const [rating, setRating] = useState(3);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
    saveInfo: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInput = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createReview({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        rating,
        productId,
      });
      setSubmitted(true);
      onSubmitted?.();
      setFormData({ name: "", email: "", message: "", saveInfo: true });
      setRating(3);
    } catch (err) {
      console.error("Failed to submit review", err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setSubmitted(false), 3000);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitted && (
        <div className="bg-[#302A25] text-white p-4 rounded-lg flex items-center gap-3">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm">✓</span>
          </div>
          <Text className="text-white">Your Review Has Been Submitted</Text>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Text className="text-[18px] font-medium text-white">Your Rating</Text>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-xl ${
                star <= rating ? "text-yellow-400" : "text-gray-400"
              } hover:text-yellow-300`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-300">{rating}.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(e) => handleInput("name", e.target.value)}
          className="w-full px-6 h-[53px] text-[16px] font-normal font-poppins bg-[#D3D3D340] text-white placeholder-white/50 rounded-[60px] border-[0.5px] border-white/50 focus:border-white focus:outline-none "
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={formData.email}
          onChange={(e) => handleInput("email", e.target.value)}
          className="w-full px-6 h-[53px] text-[16px] font-normal font-poppins bg-[#D3D3D340] text-white placeholder-white/50 rounded-[60px] border-[0.5px] border-white/50 focus:border-white focus:outline-none "
          required
        />
      </div>

      <textarea
        placeholder="Your Message"
        value={formData.message}
        onChange={(e) => handleInput("message", e.target.value)}
        rows={4}
        className="w-full px-6 py-2 h-[153px] text-[16px] font-normal font-poppins bg-[#D3D3D340] text-white placeholder-white/50 rounded-[20px] border-[0.5px] border-white/50 focus:border-white focus:outline-none "
        required
      />

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="saveInfo"
          checked={formData.saveInfo}
          onChange={(e) => handleInput("saveInfo", e.target.checked)}
          className="w-4 h-4 text-amber-600 bg-gray-700 border-gray-600 rounded focus:ring-amber-500 focus:ring-2"
        />
        <label htmlFor="saveInfo" className="text-sm text-gray-400">
          Save my name, e-mail address, and website in this browser for next
          time I comment.
        </label>
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-white text-black text-[20px] font-semibold w-[142px] h-[55px] py-3 flex justify-center rounded-lg hover:bg-gray-100 transition-colors"
      >
        {isSubmitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
};

export default ReviewsForm;
