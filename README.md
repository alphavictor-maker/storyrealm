# StoryRealm — Daily AI Adventures

An engaging interactive fiction platform where new story realms refresh daily. Users make choices that weave their unique path through 8-part story arcs with satisfying conclusions.

## Features

- **User accounts**: Email/password or Google sign-in
- **1 Free Story Per Day**: Users pick any realm, complete one story
- **Premium ($6.99/mo or $49.99/yr)**: Unlimited stories in all realms + save to library
- **8 Weaves Per Story**: Complete narrative arc with real ending
- **Server-side tracking**: No cheating by clearing browser data

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can view own data" ON user_data
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own data  
CREATE POLICY "Users can update own data" ON user_data
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can insert their own data
CREATE POLICY "Users can insert own data" ON user_data
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

6. (Optional) Enable Google Sign-In:
   - Go to **Authentication → Providers → Google**
   - Enable it and add your Google OAuth credentials
   - Get credentials at https://console.developers.google.com

### Step 2: Get Your Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Create a new API key
4. Copy it somewhere safe

### Step 3: Update the Code

Open `index.html` and find these lines near the top of the `<script>` section:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Replace with your actual Supabase values from Step 1.

### Step 4: Create a GitHub Account

If you don't have one:
1. Go to https://github.com/signup
2. Follow the signup process

### Step 5: Upload to GitHub

1. Go to https://github.com/new
2. Name your repository `storyrealm`
3. Click "Create repository"
4. Click "uploading an existing file"
5. Drag all files from this folder
6. Click "Commit changes"

### Step 6: Deploy on Vercel

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Click "Add New..." → "Project"
4. Import your `storyrealm` repository
5. Click "Deploy"

### Step 7: Add Environment Variables

In Vercel, go to your project:
1. Click **Settings → Environment Variables**
2. Add these variables:
   - `ANTHROPIC_API_KEY` = your Anthropic key
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_KEY` = your Supabase service_role key
3. Click "Save"
4. Go to **Deployments** and redeploy

### Step 8: You're Live!

Your app is at: `https://storyrealm-YOUR_USERNAME.vercel.app`

---

## Pricing

- **Free**: 1 story per day, any realm
- **Premium Monthly**: $6.99/month
- **Premium Yearly**: $49.99/year (save 40%)

Premium unlocks:
- Unlimited stories
- All 6 realms
- Save stories to library
- Past adventures archive

## Adding Stripe (Coming Soon)

To enable actual payments, you'll need to:
1. Create a Stripe account
2. Add webhook endpoints
3. Update the `handleSubscribe()` function

---

## File Structure

```
storyrealm/
├── index.html          # Main app with auth
├── api/
│   ├── chat.js         # Claude API proxy
│   └── user.js         # User data API
├── vercel.json         # Vercel config
├── package.json        # Project info
└── README.md           # This file
```
