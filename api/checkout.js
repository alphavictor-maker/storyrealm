export const config = {
  runtime: 'edge',
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const body = await request.json();
    const { priceId, userId, userEmail, successUrl, cancelUrl } = body;

    if (!priceId || !userId || !userEmail) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers });
    }

    // Create Stripe Checkout Session
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'subscription',
        'payment_method_types[0]': 'card',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        'success_url': successUrl || 'https://mystoryrealm.com?success=true',
        'cancel_url': cancelUrl || 'https://mystoryrealm.com?canceled=true',
        'customer_email': userEmail,
        'client_reference_id': userId,
        'metadata[user_id]': userId,
      }),
    });

    const session = await response.json();

    if (session.error) {
      console.error('Stripe error:', session.error);
      return new Response(JSON.stringify({ error: session.error.message }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });

  } catch (error) {
    console.error('Checkout error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create checkout session' }), { status: 500, headers });
  }
}
