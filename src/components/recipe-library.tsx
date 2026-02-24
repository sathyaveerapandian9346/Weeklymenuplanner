"use client"

import { useState, useEffect } from "react"
import { Loader2, Plus, Trash2, ChefHat, Wand2, Youtube, Save, Search, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import type { Recipe, Ingredient, RecipeWithIngredients } from "@/types/database"
import { AddRecipeDialog } from "@/components/add-recipe-dialog"

const UNITS = [
  'unit', 'cup', 'tbsp', 'tsp', 'oz', 'lb', 'g', 'kg', 'ml', 'L', 
  'piece', 'slice', 'clove', 'bunch', 'can', 'package'
];

export function RecipeLibrary({
  onRecipeAdded,
}: {
  onRecipeAdded?: () => void
}) {
  const [recipes, setRecipes] = useState<RecipeWithIngredients[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  useEffect(() => {
    fetchRecipes()
  }, [])

  const categories = ["All", ...Array.from(new Set(recipes.map(r => r.category || "Uncategorized")))]

  async function fetchRecipes() {
    const { data: recipesData } = await supabase
      .from("recipes")
      .select("*")
      .order("name")

    if (!recipesData?.length) {
      setRecipes([])
      return
    }

    const { data: ingredientsData } = await supabase
      .from("recipe_ingredients")
      .select("*")

    const ingredientsByRecipe = (ingredientsData || []).reduce(
      (acc, ing) => {
        if (!acc[ing.recipe_id]) acc[ing.recipe_id] = []
        acc[ing.recipe_id].push(ing)
        return acc
      },
      {} as Record<string, Ingredient[]>
    )

    setRecipes(
      recipesData.map((r) => ({
        ...r,
        ingredients: ingredientsByRecipe[r.id] || [],
      }))
    )
  }

  async function deleteRecipe(id: string) {
    if (!confirm("Are you sure you want to delete this recipe?")) return
    const { error } = await supabase.from("recipes").delete().eq("id", id)
    if (error) {
      alert("Error deleting: " + error.message)
    } else {
      fetchRecipes()
      onRecipeAdded?.()
    }
  }

  async function addToMealPlan(recipeId: string, mealType: string) {
    const today = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from("meal_plans")
      .insert({
        recipe_id: recipeId,
        meal_type: mealType,
        plan_date: today
      })

    if (error) {
      alert("Error adding to plan: " + error.message)
    } else {
      alert("Added to today's plan!")
      onRecipeAdded?.()
    }
  }

  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ing => ing.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || recipe.category === selectedCategory;
    return matchesSearch && matchesCategory;
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-xl font-semibold">Your Recipes</h2>
          <div className="flex items-center gap-2 flex-1 md:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <AIImportDialog onSuccess={fetchRecipes} />
              <AddRecipeDialog onSuccess={fetchRecipes} />
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap rounded-full"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecipes.map((recipe) => (
          <Card key={recipe.id} className="overflow-hidden border-t-4 border-t-primary/20">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {recipe.category || "General"}
                  </span>
                  <CardTitle className="text-lg truncate mt-1">{recipe.name}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => deleteRecipe(recipe.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  {recipe.ingredients.length} Ingredients
                </p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  {recipe.ingredients.slice(0, 2).map((ing) => (
                    <li key={ing.id} className="truncate">• {ing.name}</li>
                  ))}
                </ul>
              </div>
              
              <div className="pt-3 border-t">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground mb-2 block">
                  Quick Add to Plan
                </Label>
                <Select onValueChange={(type) => addToMealPlan(recipe.id, type)}>
                  <SelectTrigger className="h-8 text-xs w-full">
                    <SelectValue placeholder="Select Meal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <EditRecipeDialog recipe={recipe} onSuccess={fetchRecipes} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function AIImportDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [recipeName, setRecipeName] = useState("")

  async function handleImport() {
    setLoading(true)
    try {
      const { data: recipe, error: rError } = await supabase
        .from("recipes")
        .insert({ name: recipeName || "New AI Recipe" })
        .select().single()

        if (rError) throw rError

        const lines = transcript.split('\n').filter(l => l.trim().length > 0)
        for (const line of lines) {
          const match = line.match(/(\d+\.?\d*)\s*(\w+)?\s*(.*)/)
          if (match) {
            await supabase.from("recipe_ingredients").insert({
              recipe_id: recipe.id,
              amount: parseFloat(match[1]) || 1,
              unit: UNITS.includes(match[2]?.toLowerCase()) ? match[2].toLowerCase() : 'unit',
              name: match[3] || line
            })
          }
        }
        setOpen(false)
        setTranscript("")
        setRecipeName("")
        onSuccess()
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-purple-200 hover:bg-purple-50">
            <Wand2 className="h-4 w-4 text-purple-500" /> AI Import
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Youtube className="text-red-600"/> YouTube Import</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Recipe Name" value={recipeName} onChange={e => setRecipeName(e.target.value)} />
            <Textarea placeholder="Paste transcript here..." className="h-48" value={transcript} onChange={e => setTranscript(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={handleImport} disabled={loading || !transcript}>
              {loading ? <Loader2 className="animate-spin" /> : "Save Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }
  
  function EditRecipeDialog({ recipe, onSuccess }: { recipe: RecipeWithIngredients, onSuccess: () => void }) {
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(recipe.name)
    const [ingredients, setIngredients] = useState(recipe.ingredients)
  
    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      await supabase.from("recipes").update({ name }).eq("id", recipe.id)
      for (const ing of ingredients) {
        if (ing.id) {
          await supabase.from("recipe_ingredients").update({ name: ing.name, amount: ing.amount, unit: ing.unit }).eq("id", ing.id)
        }
      }
      setOpen(false)
      onSuccess()
    }
  
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button variant="outline" size="sm" className="w-full mt-2">Edit</Button></DialogTrigger>
        <DialogContent><DialogHeader><DialogTitle>Edit {recipe.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input value={name} onChange={e => setName(e.target.value)} />
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>
    )
  }