# StoryRealm — Daily AI Adventures

An engaging interactive fiction platform where new story realms refresh daily. Users make choices that weave their unique path through 8-part story arcs with satisfying conclusions.

## Features

- **User accounts**: Email/password or Google sign-in
- **1 Free Story Per Day**: Users pick any realm, complete one story
- **Premium ($6.99/mo or $49.99/yr)**: Unlimited stories in all realms + save to library
- **8 Weaves Per Story**: Complete narrative arc with real ending
- **Server-side tracking**: No cheating by clearing browser data
- **Stripe payments**: Secure subscription billing

## Quick Deploy Guide

### Step 1: Set Up Supabase (Free Database + Auth)

1. Go to https://supabase.com and create an account
2. Click "New Project" and give it a name
3. Wait for the project to be created (~2 minutes)
4. Go to **Settings → API** and copy:
   - `Project URL` (this is your SUPABASE_URL)
   - `anon public` key (this is your SUPABASE_ANON_KEY)
   - `service_role` key (this is your SUPABASE_SERVICE_KEY - keep secret!)

5. Go to **SQL Editor** and run this to create the user_data table:

```sql
CREATE TABLE user_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_premium BOOLEAN DEFAULT FALSE,
  stories_today INTEGER DEFAULT 0,
  last_play_date DATE DEFAULT CURRENT_DATE,
  chosen_realm TEXT,
  completed_today BOOLEAN DEFAULT FALSE,
  saved_stories JSONB DEFAULT '[]'::jsonb,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

6. (Optional) Enable Google Sign-In:
   - Go to **Authentication → Providers → Google**
   - Enable it and add your Google OAuth credentials

### Step 2: Set Up Stripe (Payments)

1. Go to https://stripe.com and create an account
2. Once in dashboard, go to **Developers → API Keys**
3. Copy your **Secret key** (starts with `sk_live_` or `sk_test_`)

4. Create your subscription products:
   - Go to **Products → Add Product**
   - Create "StoryRealm Monthly":
     - Price: $6.99/month, recurring
     - Copy the **Price ID** (starts with `price_`)
   - Create "StoryRealm Yearly":
     - Price: $49.99/year, recurring
     - Copy the **Price ID**

5. Set up Webhook:
   - Go to **Developers → Webhooks**
   - Click **Add endpoint**
   - URL: `https://mystoryrealm.com/api/webhook`
   - Select events: `checkout.session.completed`, `customer.subscription.deleted`, `customer.subscription.updated`
   - Copy the **Webhook signing secret** (starts with `whsec_`)

6. Update the price IDs in `index.html`:
   - Find `STRIPE_PRICES` near line 2270
   - Replace `price_MONTHLY_ID_HERE` with your monthly price ID
   - Replace `price_YEARLY_ID_HERE` with your yearly price ID

### Step 3: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Create a new API key
4. Copy it somewhere safe

### Step 4: Update the Code

Open `index.html` and find these lines near the top of the `<script>` section:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase values from Step 1.

Also update the Stripe price IDs:
```javascript
const STRIPE_PRICES = {
    monthly: 'price_YOUR_MONTHLY_PRICE_ID',
    yearly: 'price_YOUR_YEARLY_PRICE_ID'
};
```

### Step 5: Deploy to Vercel

1. Upload all files to GitHub
2. Go to https://vercel.com and import your repo
3. Add these Environment Variables:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your Supabase service_role key
   - `STRIPE_SECRET_KEY` = your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` = your Stripe webhook signing secret
4. Deploy!

### Step 6: Connect Custom Domain

1. In Vercel, go to Settings → Domains
2. Add `mystoryrealm.com`
3. Update DNS at your registrar

---

## File Structure

```
storyrealm/
├── index.html          # Main app with auth
├── api/
│   ├── chat.js         # Claude API proxy
│   ├── user.js         # User data API
│   ├── checkout.js     # Stripe checkout
│   └── webhook.js      # Stripe webhooks
├── vercel.json         # Vercel config
├── package.json        # Project info
└── README.md           # This file
```

## Pricing

- **Free**: 1 story per day, any realm
- **Premium Monthly**: $6.99/month
- **Premium Yearly**: $49.99/year (save 40%)

Premium unlocks:
- Unlimited stories
- All 6 realms
- Save stories to library
- Past adventures archive
