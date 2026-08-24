"use client";
import React from "react";
import Text from "@/ui/Text";

const RefundContent = () => {
  return (
    <div className="max-w-[1117px] mx-auto px-6 mt-[50px] py-8">
      <div className="space-y-6">
        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Cancellation, Return & Refund Policy
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            Last updated: August 24, 2026
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            This Cancellation, Return and Refund Policy applies to purchases
            made from Al Barakah Honey through https://www.albarakahoney.com/.
            By placing an order, you agree to the terms below.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Order Cancellation
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            You may request cancellation of an order before it is packed or
            handed to the courier. Once a shipment is dispatched, cancellation
            is no longer available and the Return & Refund process applies
            instead.
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            To cancel, contact us at{" "}
            <a
              href="mailto:support@albarakahoney.com"
              className="underline"
            >
              support@albarakahoney.com
            </a>{" "}
            or WhatsApp{" "}
            <a href="tel:+923256957327" className="underline">
              +92 325 6957327
            </a>{" "}
            with your order number. If payment was collected online before
            dispatch, we will refund the paid amount after we confirm the order
            has not been shipped.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Returns
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            Because our products are food items, we accept returns only in the
            following cases, reported within 48 hours of delivery:
          </Text>
          <ul className="list-disc list-inside ml-4 mb-4 space-y-2 font-poppins text-[18px] leading-[30px]">
            <li>Wrong item delivered</li>
            <li>Damaged, leaking, or incomplete package on arrival</li>
            <li>Missing items compared with your order confirmation</li>
          </ul>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            We do not accept returns of opened, used, or consumed honey, or of
            products returned without the original packaging, unless the item
            was defective or damaged on arrival.
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            Please keep photos of the parcel, packing, and product. We may ask
            for these to process your request.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Refunds
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            If we approve a cancellation, return, or claim:
          </Text>
          <ul className="list-disc list-inside ml-4 mb-4 space-y-2 font-poppins text-[18px] leading-[30px]">
            <li>
              <strong>Online payments</strong> (card or other digital methods)
              will be refunded to the original payment method, or by bank
              transfer if the original method cannot be used.
            </li>
            <li>
              <strong>Cash on Delivery (COD)</strong> orders: if no money was
              collected, there is nothing to refund. If you already paid the
              rider, we will arrange a refund after we verify the issue.
            </li>
          </ul>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            Approved refunds are typically completed within 7–14 business days,
            depending on the bank or payment provider. We may offer a
            replacement product instead of a refund where that is faster for
            you.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            How to Request a Return or Refund
          </Text>
          <Text className="mb-4 font-poppins font-normal text-[18px] leading-[30px]">
            Email{" "}
            <a
              href="mailto:support@albarakahoney.com"
              className="underline"
            >
              support@albarakahoney.com
            </a>{" "}
            or message us on WhatsApp at +92 325 6957327 with:
          </Text>
          <ul className="list-disc list-inside ml-4 mb-4 space-y-2 font-poppins text-[18px] leading-[30px]">
            <li>Order number</li>
            <li>Your name and contact number</li>
            <li>Reason for cancellation, return, or refund</li>
            <li>Photos, if the parcel or product was damaged or incorrect</li>
          </ul>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            We will review your request and confirm next steps. Al Barakah Honey
            reserves the right to refuse a return or refund that does not meet
            this policy or that we reasonably believe is fraudulent.
          </Text>
        </div>

        <div>
          <Text
            as="h2"
            className="mb-3 font-poppins font-bold text-[30px] leading-[30px]"
          >
            Contact
          </Text>
          <Text className="font-poppins font-normal text-[18px] leading-[30px]">
            Al Barakah Honey
            <br />
            Website: https://www.albarakahoney.com/
            <br />
            Email: support@albarakahoney.com
            <br />
            Phone / WhatsApp: +92 325 6957327
            <br />
            Country: Pakistan
          </Text>
        </div>
      </div>
    </div>
  );
};

export default RefundContent;
