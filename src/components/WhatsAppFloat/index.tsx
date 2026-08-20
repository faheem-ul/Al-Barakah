"use client";

import {
  WHATSAPP_SUPPORT_PHONE,
  WHATSAPP_SUPPORT_PREFILL,
} from "@/lib/constants";

const WhatsAppFloat = () => {
  const href = `https://wa.me/${WHATSAPP_SUPPORT_PHONE}?text=${encodeURIComponent(
    WHATSAPP_SUPPORT_PREFILL,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      className="fixed bottom-[calc(1.25rem+var(--sticky-cta-offset,0px))] right-4 z-[95] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105 hover:bg-[#1ebe57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] sm:bottom-[calc(1.5rem+var(--sticky-cta-offset,0px))] sm:right-6"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="currentColor"
        className="h-8 w-8"
        aria-hidden
      >
        <path d="M16.004 3C9.382 3 4 8.382 4 15.004c0 2.367.688 4.567 1.875 6.434L4 29l7.77-1.84A11.92 11.92 0 0 0 16.004 27C22.626 27 28 21.618 28 15.004 28 8.382 22.626 3 16.004 3zm0 21.867a9.8 9.8 0 0 1-5.004-1.367l-.359-.215-4.004.945.957-3.9-.234-.375A9.8 9.8 0 0 1 6.137 15c0-5.434 4.433-9.867 9.867-9.867S25.871 9.566 25.871 15s-4.433 9.867-9.867 9.867zm5.406-7.398c-.297-.148-1.754-.867-2.027-.965-.27-.1-.469-.148-.668.149-.198.297-.77.965-.942 1.164-.174.198-.348.223-.645.074-.297-.148-1.254-.461-2.39-1.473-.883-.788-1.48-1.761-1.652-2.059-.174-.297-.019-.457.13-.605.134-.133.297-.347.446-.52.148-.174.198-.297.297-.496.099-.198.05-.371-.025-.52-.074-.148-.668-1.611-.916-2.207-.242-.58-.487-.5-.668-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.793.372-.271.297-1.04 1.016-1.04 2.48 0 1.461 1.066 2.875 1.215 3.074.148.198 2.095 3.2 5.076 4.487.71.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.123-.271-.198-.57-.346z" />
      </svg>
    </a>
  );
};

export default WhatsAppFloat;
