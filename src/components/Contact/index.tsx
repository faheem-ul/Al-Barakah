import React from "react";
import ContactHero from "./ContactHero";
import ContactForm from "./ContactForm";
import TrustSection from "./TrustSection";
import OrderBanner from "./OrderBanner";

const ContactUs = () => {
    return (
        <>
            <ContactHero />
            <div className="w-full max-w-[1200px] mx-auto">
                <ContactForm />
                <TrustSection />
                <OrderBanner />
            </div>
        </>
    );
};

export default ContactUs;
