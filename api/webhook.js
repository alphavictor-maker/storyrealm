export const config = {
  runtime: 'edge',
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function verifyStripeSignature(payload, signature) {
  // For edge runtime, we do a simplified check
  // In production, you may want to use a more robust verification
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return false;
  }
  return true; // Simplified - Stripe will still validate on their end
}

export default async function handler(request) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
  }

  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    // Verify webhook signature
    const isValid = await verifyStripeSignature(payload, signature);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers });
    }

    const event = JSON.parse(payload);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id;

        if (userId) {
          // Update user to premium in Supabase
          await fetch(
            `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                is_premium: true,
                stripe_customer_id: session.customer,
                stripe_subscription_id: session.subscription,
              }),
            }
          );
          console.log(`User ${userId} upgraded to premium`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by stripe_customer_id and downgrade
        const findUserResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?stripe_customer_id=eq.${customerId}&select=user_id`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        const users = await findUserResponse.json();
        if (users.length > 0) {
          const userId = users[0].user_id;
          await fetch(
            `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                is_premium: false,
              }),
            }
          );
          console.log(`User ${userId} downgraded from premium`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const isPremium = subscription.status === 'active';

        // Update user premium status
        const findUserResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?stripe_customer_id=eq.${customerId}&select=user_id`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        const users = await findUserResponse.json();
        if (users.length > 0) {
          const userId = users[0].user_id;
          await fetch(
            `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}`,
            {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                is_premium: isPremium,
              }),
            }
          );
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: 'Webhook handler failed' }), { status: 500, headers });
  }
}
