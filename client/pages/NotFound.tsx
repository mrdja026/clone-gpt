import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="border-b bg-card">
        <div className="container mx-auto py-3 font-semibold">JiraGPT</div>
      </header>
      <main className="flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-3">404</h1>
          <p className="text-muted-foreground mb-6">Page not found</p>
          <Link to="/" className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-2">
            Go home
          </Link>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
