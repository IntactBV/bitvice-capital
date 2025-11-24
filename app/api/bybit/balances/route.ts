import { getWalletBalances } from '@bvcRepositories/bybit.repo';

export async function GET() {
  try {
    const balances = await getWalletBalances("UNIFIED");

    return new Response(JSON.stringify({ success: true, data: balances }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Optionally log the error server-side
    console.error('Failed to fetch Bybit wallet balances', err);

    const message =
      err instanceof Error ? err.message : 'Failed to fetch balances';

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}