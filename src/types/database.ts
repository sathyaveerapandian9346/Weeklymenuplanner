export interface Ingredient {
  id?: string
  recipe_id: string
  name: string
  amount: number
  unit: string
}

export interface Recipe {
  id: string
  name: string
  category?: string
  created_at?: string
}

export interface MealPlan {
  id: string
  recipe_id: string
  plan_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  created_at?: string
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[]
}
