-- Weekly Menu Planner - Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ingredients table (linked to recipes)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'unit',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plans table (links recipes to specific days)
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, meal_type)
);

-- Enable Row Level Security (optional - remove if you want public access for development)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Policies for public read/write (adjust for auth when you add it)
CREATE POLICY "Allow public read recipes" ON recipes FOR SELECT USING (true);
CREATE POLICY "Allow public insert recipes" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update recipes" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete recipes" ON recipes FOR DELETE USING (true);

CREATE POLICY "Allow public read ingredients" ON recipe_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public insert ingredients" ON recipe_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update ingredients" ON recipe_ingredients FOR UPDATE USING (true);
CREATE POLICY "Allow public delete ingredients" ON recipe_ingredients FOR DELETE USING (true);

CREATE POLICY "Allow public read meal_plans" ON meal_plans FOR SELECT USING (true);
CREATE POLICY "Allow public insert meal_plans" ON meal_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update meal_plans" ON meal_plans FOR UPDATE USING (true);
CREATE POLICY "Allow public delete meal_plans" ON meal_plans FOR DELETE USING (true);
