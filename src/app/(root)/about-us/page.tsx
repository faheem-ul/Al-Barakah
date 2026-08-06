import AboutHero from "@/components/AboutUs/Hero";
import NatureGift from "@/components/AboutUs/NatureGift";
import PureHoney from "@/components/AboutUs/PureHoney";
import GoogleReviews from "@/components/GoogleReviews";

const AboutUs = () => {
  return (
    <>
      <AboutHero />
      <NatureGift />
      <div className="mt-15 mx-auto md:max-w-7xl">
        <GoogleReviews />
      </div>
      <PureHoney />
    </>
  );
};

export default AboutUs;
