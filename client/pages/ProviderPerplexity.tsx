import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function ProviderPerplexity() {
  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <AppHeader
        right={
          <>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Home</Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
            <ProvidersMenu />
            <ThemeToggle />
          </>
        }
      />
      <main className="container mx-auto py-12 md:py-16 px-4">
        <section className="mx-auto max-w-3xl">
          <Card className="rounded-3xl">
            <CardHeader>
              <CardTitle>Perplexity</CardTitle>
              <CardDescription>
                Enter your creds data here. This page is a placeholder UI; handle real secrets on the server only.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={(e) => e.preventDefault()}>Save</Button>
                <Button variant="outline" asChild>
                  <Link to="/">Back to Home</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
