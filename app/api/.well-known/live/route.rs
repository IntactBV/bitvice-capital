// app/api/.well-known/live/route.ts
export async function GET(): Promise<Response> {
  return new Response(JSON.stringify({ status: "live" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

export async function HEAD(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}