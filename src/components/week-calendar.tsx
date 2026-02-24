"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays } from "date-fns"
import { ChevronLeft, ChevronRight, Plus, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { Recipe, MealPlan } from "@/types/database"
import { AddRecipeDialog } from "@/components/add-recipe-dialog"

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const

export function WeekCalendar() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loadingRecipes, setLoadingRecipes] = useState(true)
  const [assigningMeal, setAssigningMeal] = useState<string | null>(null)

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Fetch recipes on mount and whenever component remounts (via key prop)
  useEffect(() => {
    fetchRecipes()
  }, [])

  useEffect(() => {
    fetchMealPlans()
  }, [weekStart])

  // Also refetch recipes periodically to catch any external changes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRecipes()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [])

  async function fetchRecipes() {
    setLoadingRecipes(true)
    try {
      const { data, error } = await supabase.from("recipes").select("*").order("name")
      if (error) {
        console.error("Error fetching recipes:", error)
        return
      }
      setRecipes(data || [])
    } finally {
      setLoadingRecipes(false)
    }
  }

  async function fetchMealPlans() {
    const endDate = addDays(weekStart, 6)
    const startDateStr = format(weekStart, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")
    
    console.log("fetchMealPlans called:", { startDateStr, endDateStr })
    
    // Try both table names
    const tableNames = ["meal_plans", "meal_plan"]
    let data: any[] | null = null
    
    for (const tableName of tableNames) {
      try {
        console.log(`Fetching from table: ${tableName}`)
        const { data: fetchedData, error } = await supabase
          .from(tableName)
          .select("*")
          .gte("plan_date", startDateStr)
          .lte("plan_date", endDateStr)
        
        if (error) {
          console.error(`Error fetching from ${tableName}:`, error)
          // If table doesn't exist, try next one
          if (error.message?.includes("does not exist") || error.code === "42P01") {
            console.log(`Table ${tableName} does not exist, trying next...`)
            continue
          }
          throw error
        }
        
        console.log(`✓ Successfully fetched from ${tableName}:`, fetchedData)
        data = fetchedData
        break // Success, exit loop
      } catch (err: any) {
        console.error(`Error with ${tableName}:`, err)
        if (tableName === tableNames[tableNames.length - 1]) {
          // Last table name, show error
          console.error("Failed to fetch from all table names")
        }
      }
    }
    
    setMealPlans(data || [])
  }

  function getMealForDay(date: Date, mealType: string) {
    const dateStr = format(date, "yyyy-MM-dd")
    const plan = mealPlans.find(
      (p) => p.plan_date === dateStr && p.meal_type === mealType
    )
    return plan ? recipes.find((r) => r.id === plan.recipe_id) : null
  }

  async function assignRecipe(
    date: Date,
    mealType: string,
    recipeId: string | null
  ) {
    const dateStr = format(date, "yyyy-MM-dd")
    const mealKey = `${dateStr}-${mealType}`
    
    console.log("=== assignRecipe called ===")
    console.log("Parameters:", { dateStr, mealType, recipeId })
    console.log("Available recipes:", recipes.map(r => ({ id: r.id, name: r.name })))
    
    // Verify recipe_id exists if provided
    if (recipeId && recipeId !== "none") {
      const recipeExists = recipes.find((r) => r.id === recipeId)
      if (!recipeExists) {
        console.error("Recipe ID not found in recipes list:", recipeId)
        alert(`Error: Recipe ID "${recipeId}" not found in recipes.\n\nAvailable recipes:\n${recipes.map(r => `- ${r.name} (${r.id})`).join("\n")}`)
        return
      }
      console.log("✓ Recipe found:", recipeExists)
    }
    
    setAssigningMeal(mealKey)

    // Try both table names in case the database uses singular form
    const tableNames = ["meal_plans", "meal_plan"]
    let lastError: any = null

    try {
      if (recipeId && recipeId !== "none") {
        const existing = mealPlans.find(
          (p) => p.plan_date === dateStr && p.meal_type === mealType
        )
        
        console.log("Existing meal plan in state:", existing)
        console.log("Attempting to save:", { recipe_id: recipeId, plan_date: dateStr, meal_type: mealType })
        
        // Try to upsert (insert or update) - handles unique constraint gracefully
        for (const tableName of tableNames) {
          try {
            console.log(`Trying table: ${tableName}`)
            
            if (existing) {
              console.log(`Updating existing meal plan in ${tableName} with ID:`, existing.id)
              const { data, error } = await supabase
                .from(tableName)
                .update({ recipe_id: recipeId, meal_type: mealType })
                .eq("id", existing.id)
                .select()
              
              console.log(`Update result for ${tableName}:`, { data, error })
              
              if (error) {
                lastError = error
                console.error(`Error updating in ${tableName}:`, error)
                // If it's a "relation does not exist" error, try next table name
                if (error.message?.includes("does not exist") || error.code === "42P01") {
                  console.log(`Table ${tableName} does not exist, trying next...`)
                  continue
                }
                throw error
              }
              
              console.log(`✓ Successfully updated meal plan in ${tableName}:`, data)
              break // Success, exit loop
            } else {
              console.log(`Creating new meal plan in ${tableName}`)
              const { data, error } = await supabase
                .from(tableName)
                .insert({
                  recipe_id: recipeId,
                  plan_date: dateStr,
                  meal_type: mealType,
                })
                .select()
              
              console.log(`Insert result for ${tableName}:`, { data, error })
              
              if (error) {
                lastError = error
                console.error(`Error inserting into ${tableName}:`, error)
                
                // If unique constraint violation, try to update instead
                if (error.code === "23505" || error.message?.includes("unique") || error.message?.includes("duplicate")) {
                  console.log("Unique constraint violation detected, attempting update instead...")
                  // Fetch the existing record and update it
                  const { data: existingData } = await supabase
                    .from(tableName)
                    .select("id")
                    .eq("plan_date", dateStr)
                    .eq("meal_type", mealType)
                    .single()
                  
                  if (existingData) {
                    const { data: updateData, error: updateError } = await supabase
                      .from(tableName)
                      .update({ recipe_id: recipeId, meal_type: mealType })
                      .eq("id", existingData.id)
                      .select()
                    
                    if (updateError) {
                      throw updateError
                    }
                    console.log(`✓ Successfully updated existing record in ${tableName}:`, updateData)
                    break
                  }
                }
                
                // If it's a "relation does not exist" error, try next table name
                if (error.message?.includes("does not exist") || error.code === "42P01") {
                  console.log(`Table ${tableName} does not exist, trying next...`)
                  continue
                }
                
                throw error
              }
              
              console.log(`✓ Successfully created meal plan in ${tableName}:`, data)
              break // Success, exit loop
            }
          } catch (err: any) {
            lastError = err
            // If this is the last table name, throw the error
            if (tableName === tableNames[tableNames.length - 1]) {
              throw err
            }
            // Otherwise, continue to next table name
            console.log(`Error with ${tableName}, trying next table...`)
          }
        }
      } else {
        // Removing meal plan (recipeId is null or "none")
        const existing = mealPlans.find(
          (p) => p.plan_date === dateStr && p.meal_type === mealType
        )
        if (existing) {
          for (const tableName of tableNames) {
            try {
              console.log(`Deleting meal plan from ${tableName} with ID:`, existing.id)
              const { data, error } = await supabase
                .from(tableName)
                .delete()
                .eq("id", existing.id)
                .select()
              
              console.log(`Delete result for ${tableName}:`, { data, error })
              
              if (error) {
                lastError = error
                // If it's a "relation does not exist" error, try next table name
                if (error.message?.includes("does not exist") || error.code === "42P01") {
                  console.log(`Table ${tableName} does not exist, trying next...`)
                  continue
                }
                throw error
              }
              
              console.log(`✓ Successfully deleted meal plan from ${tableName}`)
              break // Success, exit loop
            } catch (err: any) {
              lastError = err
              if (tableName === tableNames[tableNames.length - 1]) {
                throw err
              }
            }
          }
        }
      }
      
      // Immediately refresh meal plans to show the updated state
      console.log("Refreshing meal plans immediately...")
      await fetchMealPlans()
      console.log("✓ Meal plans refreshed successfully - recipe should now appear in the dropdown")
    } catch (err: any) {
      console.error("❌ Error in assignRecipe:", err)
      console.error("Full error object:", JSON.stringify(err, null, 2))
      const errorMessage = err.message || "Unknown error"
      const errorDetails = JSON.stringify(err, null, 2)
      alert(`Failed to save meal plan!\n\nError: ${errorMessage}\n\nFull Details:\n${errorDetails}\n\nRecipe ID: ${recipeId}\nPlan Date: ${dateStr}\nMeal Type: ${mealType}\n\nCheck the browser console for more details.`)
    } finally {
      setAssigningMeal(null)
    }
  }

  async function handleRecipeAdded() {
    await fetchRecipes()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg min-w-[200px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <AddRecipeDialog onSuccess={handleRecipeAdded} />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecipes}
            disabled={loadingRecipes}
            title="Refresh recipes"
          >
            {loadingRecipes ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            This Week
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="grid grid-cols-7 gap-2 min-w-[600px] sm:min-w-0">
          {weekDays.map((day) => (
            <Card key={day.toISOString()} className="flex-1 min-w-0">
              <CardHeader className="p-3 sm:p-4">
                <p className="text-xs text-muted-foreground font-medium uppercase">
                  {format(day, "EEE")}
                </p>
                <p className="text-lg font-bold">
                  {format(day, "d")}
                </p>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0 space-y-2">
                {MEAL_TYPES.map((mealType) => {
                  const mealKey = `${format(day, "yyyy-MM-dd")}-${mealType}`
                  const isAssigning = assigningMeal === mealKey
                  return (
                    <MealSlot
                      key={`${day}-${mealType}`}
                      date={day}
                      mealType={mealType}
                      currentRecipe={getMealForDay(day, mealType)}
                      recipes={recipes}
                      loadingRecipes={loadingRecipes}
                      isAssigning={isAssigning}
                      onAssign={(recipeId) => assignRecipe(day, mealType, recipeId)}
                    />
                  )
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function MealSlot({
  date,
  mealType,
  currentRecipe,
  recipes,
  loadingRecipes,
  isAssigning,
  onAssign,
}: {
  date: Date
  mealType: string
  currentRecipe: Recipe | null | undefined
  recipes: Recipe[]
  loadingRecipes: boolean
  isAssigning: boolean
  onAssign: (recipeId: string | null) => void
}) {
  const handleValueChange = (value: string) => {
    console.log("MealSlot - Select value changed:", { value, mealType, date })
    const recipeId = value === "none" ? null : value
    console.log("MealSlot - Calling onAssign with:", recipeId)
    onAssign(recipeId)
  }

  return (
    <div className="border rounded-md p-2 bg-muted/30 min-h-[60px] relative">
      <p className="text-[10px] text-muted-foreground capitalize mb-1">
        {mealType}
      </p>
      {isAssigning && (
        <div className="absolute inset-0 bg-background/80 rounded-md flex items-center justify-center z-10">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      )}
      <Select
        value={currentRecipe?.id ?? "none"}
        onValueChange={handleValueChange}
        disabled={isAssigning || loadingRecipes}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder={loadingRecipes ? "Loading..." : "Add recipe"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">—</SelectItem>
          {recipes.length === 0 && !loadingRecipes && (
            <SelectItem value="no-recipes" disabled>
              No recipes available
            </SelectItem>
          )}
          {recipes.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
