import React from "react";
import Image from "next/image";

const TrustSection = () => {
  return (
    <section className="bg-gray-50 py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text & Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Building Relationships Based On Trust, Integrity.
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed">
               {`
                At Al Baraka Honey, We Believe In Honesty And Authenticity. Our Honey Is Harvested Naturally, 
                Without Artificial Additives, Ensuring Every Drop Is Pure, Safe, And Packed With Nutrition. 
                From Hive To Home, We Deliver Nature's Sweetness With Integrity And Care.
               `}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FeatureBox
                icon="🍯"
                title="3+"
                subtitle="Premium Honey Varieties"
                description="We Proudly Offer Rare Wild Honey From Apis Mellifera, Apis Florea, And The Unique Berry Bee Honey, Giving You Rich Flavors From Nature's Finest Sources."
              />
              <FeatureBox
                icon="🌿"
                title="100%"
                subtitle="Natural & Chemical-Free"
                description="Our Honey Is Free From Preservatives, Sugar Syrups, And Chemicals – Just Pure, Raw Goodness As Nature Intended."
              />
            </div>
          </div>
          
          {/* Right Column - Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/contactus/build relationship.png"
                alt="Beekeeper with honey"
                width={600}
                height={800}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FeatureBox = ({ 
  icon, 
  title, 
  subtitle, 
  description 
}: { 
  icon: string; 
  title: string; 
  subtitle: string; 
  description: string; 
}) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-3xl font-bold text-gray-900 mb-2">{title}</h3>
      <h4 className="text-lg font-semibold text-gray-800 mb-3">{subtitle}</h4>
      <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
};

export default TrustSection;
