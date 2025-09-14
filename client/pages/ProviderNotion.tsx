import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import ProvidersMenu from "@/components/ProvidersMenu";
import ThemeToggle from "@/components/ThemeToggle";

export default function ProviderNotion() {
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
              <CardTitle>Notion</CardTitle>
              <CardDescription>
                Enter your creds data here. Configure the following environment variables on the server for Notion integration:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-background p-4 text-sm">
                <p className="mb-2"><code>NOTION_API_KEY=seccc</code></p>
                <p><code>NOTION_DATABASE_ID=DBSC</code></p>
              </div>
              <p className="text-muted-foreground mt-4">
                Place these in your <code>.env</code> (or use <code>env.example</code>). Do not expose real secrets in client code.
              </p>
              <div className="flex gap-3 mt-6">
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
