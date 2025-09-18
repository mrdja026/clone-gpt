import { useState } from "react";
import { LaneBQueryRequest, LaneBResponse } from "@shared/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, MessageSquare, Wrench } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LaneBTest() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LaneBResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: LaneBQueryRequest = {
        query: query.trim(),
      };

      const response = await fetch("/api/lane-b/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: LaneBResponse = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "gemma":
        return <Wrench className="w-4 h-4" />;
      case "matcher":
        return <CheckCircle className="w-4 h-4" />;
      case "chat":
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "gemma":
        return "bg-purple-100 text-purple-800";
      case "matcher":
        return "bg-green-100 text-green-800";
      case "chat":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Lane B Query Interpreter</h1>
        <p className="text-gray-600">
          Test the Lane B service that interprets natural language queries and
          converts them to tool calls or chat responses.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Query</CardTitle>
            <CardDescription>
              Enter a query to test Lane B interpretation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="query"
                  className="block text-sm font-medium mb-2"
                >
                  Query
                </label>
                <Input
                  id="query"
                  type="text"
                  placeholder="e.g., SCRUM-42, get data from space rag-experiments, hello world"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full"
              >
                {loading ? "Processing..." : "Test Query"}
              </Button>
            </form>

            {error && (
              <Alert className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>Lane B interpretation results</CardDescription>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="text-center text-gray-500 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Enter a query and click "Test Query" to see results</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Processing query...</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={getSourceColor(result.source)}>
                    {getSourceIcon(result.source)}
                    <span className="ml-1">{result.source.toUpperCase()}</span>
                  </Badge>
                  <Badge
                    variant={result.type === "tool" ? "default" : "secondary"}
                  >
                    {result.type.toUpperCase()}
                  </Badge>
                </div>

                {result.tool_calls && result.tool_calls.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tool Calls:</h4>
                    <div className="space-y-2">
                      {result.tool_calls.map((toolCall, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md">
                          <div className="font-mono text-sm">
                            <span className="text-blue-600">
                              {toolCall.name}
                            </span>
                            <span className="text-gray-600">
                              ({JSON.stringify(toolCall.arguments, null, 2)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.chat && (
                  <div>
                    <h4 className="font-medium mb-2">Chat Response:</h4>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-gray-700">{result.chat}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Examples */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Test Examples</CardTitle>
          <CardDescription>
            Try these example queries to test different Lane B behaviors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-green-700">
                Matcher (Deterministic)
              </h4>
              <div className="space-y-1 text-sm">
                <button
                  onClick={() => setQuery("SCRUM-42")}
                  className="block text-blue-600 hover:underline"
                >
                  SCRUM-42
                </button>
                <button
                  onClick={() =>
                    setQuery("get data from space rag-experiments")
                  }
                  className="block text-blue-600 hover:underline"
                >
                  get data from space rag-experiments
                </button>
                <button
                  onClick={() => setQuery("fetch data for user @john")}
                  className="block text-blue-600 hover:underline"
                >
                  fetch data for user @john
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-purple-700">
                Gemma (AI Interpretation)
              </h4>
              <div className="space-y-1 text-sm">
                <button
                  onClick={() =>
                    setQuery("what's the status of ticket SCRUM-42")
                  }
                  className="block text-blue-600 hover:underline"
                >
                  what's the status of ticket SCRUM-42
                </button>
                <button
                  onClick={() =>
                    setQuery("show me data from my rag experiments space")
                  }
                  className="block text-blue-600 hover:underline"
                >
                  show me data from my rag experiments space
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-blue-700">Chat (Fallback)</h4>
              <div className="space-y-1 text-sm">
                <button
                  onClick={() => setQuery("hello world")}
                  className="block text-blue-600 hover:underline"
                >
                  hello world
                </button>
                <button
                  onClick={() => setQuery("tell me a joke")}
                  className="block text-blue-600 hover:underline"
                >
                  tell me a joke
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
