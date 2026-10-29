import Link from "next/link";

import { Button } from "@/ui/button";
import Text from "@/ui/Text";

/** Shared 404 content — use inside `(root)/not-found` (nav/footer from layout). */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center bg-white px-6 py-16 text-center">
      <Text
        as="h1"
        className="text-primary-foreground mb-2 text-[56px] leading-none md:text-[72px]"
      >
        404
      </Text>
      <Text as="h2" className="text-foreground mb-3 text-[22px] md:text-[28px]">
        Page not found
      </Text>
      <Text className="text-caption mb-8 max-w-md text-[16px] md:text-[18px]">
        The page you are looking for does not exist or may have been moved.
      </Text>
      <Button variant="default" size="default" asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
