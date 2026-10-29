import NotFoundPage from "@/components/NotFoundPage";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TopBar from "@/components/TopBar";

/** Global 404 (routes outside `(root)` group). */
export default function GlobalNotFound() {
  return (
    <div className="min-h-screen bg-white">
      <TopBar />
      <Navbar />
      <NotFoundPage />
      <Footer />
    </div>
  );
}
