"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

const UNITS = [
  "unit",
  "cup",
  "tbsp",
  "tsp",
  "oz",
  "lb",
  "g",
  "kg",
  "ml",
  "L",
  "piece",
  "slice",
  "clove",
  "bunch",
  "can",
  "package",
]

export function AddRecipeDialog({
  onSuccess,
}: {
  onSuccess?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [ingredients, setIngredients] = useState<
    { name: string; amount: number; unit: string }[]
  >([{ name: "", amount: 1, unit: "unit" }])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setName("")
      setIngredients([{ name: "", amount: 1, unit: "unit" }])
      setError(null)
      setSuccess(false)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    
    if (!name.trim()) {
      setError("Recipe name is required")
      return
    }

    const validIngredients = ingredients.filter((i) => i.name.trim())
    if (validIngredients.length === 0) {
      setError("Please add at least one ingredient")
      return
    }

    setIsSubmitting(true)

    try {
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert({ name: name.trim() })
        .select("id")
        .single()

      if (recipeError) throw recipeError

      if (recipe) {
        const { error: ingredientsError } = await supabase
          .from("recipe_ingredients")
          .insert(
            validIngredients.map((i) => ({
              recipe_id: recipe.id,
              name: i.name.trim(),
              amount: i.amount,
              unit: i.unit,
            }))
          )

        if (ingredientsError) throw ingredientsError

        setSuccess(true)
        setTimeout(() => {
          setName("")
          setIngredients([{ name: "", amount: 1, unit: "unit" }])
          setSuccess(false)
          setOpen(false)
          onSuccess?.()
        }, 1000)
      }
    } catch (err: any) {
      setError(err.message || "Failed to save recipe. Please try again.")
      setIsSubmitting(false)
    }
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: "", amount: 1, unit: "unit" }])
  }

  function removeIngredient(i: number) {
    setIngredients(ingredients.filter((_, idx) => idx !== i))
  }

  function updateIngredient(
    i: number,
    field: "name" | "amount" | "unit",
    value: string | number
  ) {
    const next = [...ingredients]
    next[i] = { ...next[i], [field]: value }
    setIngredients(next)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add New Recipe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-base font-semibold">
              Recipe Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              placeholder="e.g. Spaghetti Carbonara"
              className="h-11 text-base"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-base font-semibold">
                Ingredients <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIngredient}
                disabled={isSubmitting}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Ingredient
              </Button>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {ingredients.map((ing, i) => (
                <div
                  key={i}
                  className="flex gap-2 items-start p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`ing-name-${i}`} className="text-xs text-muted-foreground mb-1 block">
                      Ingredient Name
                    </Label>
                    <Input
                      id={`ing-name-${i}`}
                      placeholder="e.g. Eggs"
                      value={ing.name}
                      onChange={(e) => updateIngredient(i, "name", e.target.value)}
                      className="h-9"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`ing-amount-${i}`} className="text-xs text-muted-foreground mb-1 block">
                      Quantity
                    </Label>
                    <Input
                      id={`ing-amount-${i}`}
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="1"
                      value={ing.amount}
                      onChange={(e) =>
                        updateIngredient(i, "amount", parseFloat(e.target.value) || 0)
                      }
                      className="h-9"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="w-32">
                    <Label htmlFor={`ing-unit-${i}`} className="text-xs text-muted-foreground mb-1 block">
                      Unit
                    </Label>
                    <Select
                      value={ing.unit}
                      onValueChange={(v) => updateIngredient(i, "unit", v)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIngredient(i)}
                    disabled={isSubmitting || ingredients.length === 1}
                    className="mt-6 shrink-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            {ingredients.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No ingredients added. Click "Add Ingredient" to get started.
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-emerald-800 font-medium">
                Recipe saved successfully! It will appear in the calendar dropdown.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[100px]">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Recipe"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
