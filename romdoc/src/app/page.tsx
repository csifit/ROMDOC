import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();

  const { data: cities, error } = await supabase
    .from("cities")
    .select("id, slug")
    .limit(5);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">RomDoc</h1>

      <p className="mt-4">
        Multilingual healthcare directory for Romania.
      </p>

      <div className="mt-8 rounded border p-4">
        <h2 className="text-xl font-semibold">Supabase Connection Test</h2>

        {error ? (
          <pre className="mt-4 text-red-600">
            {JSON.stringify(error, null, 2)}
          </pre>
        ) : (
          <pre className="mt-4">
            {JSON.stringify(cities, null, 2)}
          </pre>
        )}
      </div>
    </main>
  );
}