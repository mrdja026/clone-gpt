export function HomeHero() {
  return (
    <div className="text-center space-y-8">
      <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
        <svg
          className="w-8 h-8 text-primary-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <div className="space-y-4">
        <h1 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight">
          Ship faster with{" "}
          <span className="text-primary">deterministic prompts</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Pick a template, replace the placeholder, and get to work. Clean,
          fast, and focused—like a modern SaaS.
        </p>
      </div>
    </div>
  );
}
