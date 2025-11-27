export const config = {
  runtime: 'edge',
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // Get user ID from authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token and get user
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers });
    }

    const user = await userResponse.json();
    const userId = user.id;

    if (request.method === 'GET') {
      // Get user data
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );

      const data = await response.json();
      
      if (data.length === 0) {
        // Create new user data
        const today = new Date().toISOString().split('T')[0];
        const newUserData = {
          user_id: userId,
          is_premium: false,
          stories_today: 0,
          last_play_date: today,
          chosen_realm: null,
          completed_today: false,
          saved_stories: [],
        };

        await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify(newUserData),
        });

        return new Response(JSON.stringify(newUserData), { status: 200, headers });
      }

      let userData = data[0];
      const today = new Date().toISOString().split('T')[0];

      // Reset daily limits if it's a new day
      if (userData.last_play_date !== today) {
        userData.stories_today = 0;
        userData.chosen_realm = null;
        userData.completed_today = false;
        userData.last_play_date = today;

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
              stories_today: 0,
              chosen_realm: null,
              completed_today: false,
              last_play_date: today,
            }),
          }
        );
      }

      return new Response(JSON.stringify(userData), { status: 200, headers });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { action, data } = body;

      if (action === 'start_story') {
        // Update chosen realm and increment story count
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
              chosen_realm: data.realm,
              stories_today: data.stories_today,
            }),
          }
        );

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === 'complete_story') {
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
              completed_today: true,
            }),
          }
        );

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === 'save_story') {
        // Get current saved stories
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=saved_stories`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        const userData = await response.json();
        const savedStories = userData[0]?.saved_stories || [];
        
        // Add new story to beginning, keep max 50
        savedStories.unshift(data.story);
        if (savedStories.length > 50) {
          savedStories.length = 50;
        }

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
              saved_stories: savedStories,
            }),
          }
        );

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      if (action === 'delete_story') {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/user_data?user_id=eq.${userId}&select=saved_stories`,
          {
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );

        const userData = await response.json();
        const savedStories = userData[0]?.saved_stories || [];
        
        savedStories.splice(data.index, 1);

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
              saved_stories: savedStories,
            }),
          }
        );

        return new Response(JSON.stringify({ success: true }), { status: 200, headers });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers });
  }
}
