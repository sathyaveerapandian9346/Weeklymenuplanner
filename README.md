# Weekly Menu Planner

A personal weekly menu planner built with Next.js, Tailwind CSS, and Supabase. Plan your meals, manage recipes with ingredients, and generate aggregated grocery lists.

## Features

- **7-Day Week View** – Calendar view for the current week with breakfast, lunch, dinner, and snack slots
- **Recipe Library** – Add recipes with ingredient lists (name, amount, unit)
- **Generate Grocery List** – Aggregates all ingredients for the planned week (e.g., 2 eggs + 4 eggs = 6 eggs)
- **Mobile-responsive** – Clean UI that works on all screen sizes

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings** → **API** to get your URL and anon key
3. Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

4. Add your Supabase credentials to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Run the schema in the Supabase SQL Editor (Dashboard → SQL Editor):

```sql
-- Copy and run the contents of supabase/schema.sql
```

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (database)
- **shadcn/ui** (Button, Card, Calendar, Dialog, Select, Tabs)
- **date-fns** (date utilities)
