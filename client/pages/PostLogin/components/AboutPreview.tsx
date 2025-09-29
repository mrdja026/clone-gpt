import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AboutContent from "@/components/AboutContent";

export default function AboutPreview() {
  return (
    <section>
      <div className="mx-auto max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">About</h2>
          <Button variant="link" asChild>
            <Link to="/about">View full page</Link>
          </Button>
        </div>
        <div>
          <AboutContent compact />
        </div>
      </div>
    </section>
  );
}
