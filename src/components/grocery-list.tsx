"use client"

import { useState, useEffect } from "react"
import { format, startOfWeek, addDays } from "date-fns"
import { ShoppingCart, Loader2, Copy, Check, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"

interface AggregatedIngredient {
  name: string
  amount: number
  unit: string
  checked?: boolean
}

const STORAGE_KEY_PREFIX = "grocery-checked-"

// Category keywords (lowercase) -> display name. Order defines category order.
const CATEGORY_MAP: { keywords: string[]; label: string }[] = [
  { keywords: ["chicken", "beef", "pork", "lamb", "turkey", "bacon", "sausage", "ham", "mince", "ground beef", "steak", "salmon", "fish", "tuna", "shrimp", "prawn", "cod", "tilapia", "crab", "meat", "seafood"], label: "Meat & Seafood" },
  { keywords: ["milk", "cheese", "yogurt", "cream", "butter", "egg", "eggs"], label: "Dairy & Eggs" },
  { keywords: ["onion", "garlic", "tomato", "potato", "carrot", "broccoli", "spinach", "lettuce", "pepper", "celery", "cucumber", "mushroom", "ginger", "cabbage", "kale", "zucchini", "squash", "pea", "bean", "corn", "avocado", "leek", "radish", "asparagus", "eggplant", "vegetable"], label: "Vegetables" },
  { keywords: ["apple", "banana", "orange", "lemon", "lime", "berry", "strawberry", "blueberry", "raspberry", "mango", "grape", "peach", "pear", "melon", "watermelon", "pineapple", "kiwi", "fruit", "coconut", "raisin", "cranberry"], label: "Fruits" },
  { keywords: ["flour", "sugar", "rice", "pasta", "noodle", "bread", "oil", "vinegar", "sauce", "stock", "broth", "canned", "beans", "lentil", "oat", "cereal", "nut", "honey", "jam", "spice", "herb", "salt", "pepper", "mustard", "ketchup", "soy", "salsa", "soup", "cracker", "cookie", "chocolate", "cocoa", "baking", "yeast", "breadcrumb"], label: "Pantry & Dry Goods" },
  { keywords: ["bagel", "tortilla", "wrap", "roll", "croissant"], label: "Bakery" },
]
const OTHER_LABEL = "Other"

function getCategoryForIngredient(name: string): string {
  const lower = name.toLowerCase()
  for (const { keywords, label } of CATEGORY_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return label
  }
  return OTHER_LABEL
}

function groupByCategory(ingredients: AggregatedIngredient[]): Map<string, AggregatedIngredient[]> {
  const order = [...CATEGORY_MAP.map((c) => c.label), OTHER_LABEL]
  const map = new Map<string, AggregatedIngredient[]>()
  for (const ing of ingredients) {
    const cat = getCategoryForIngredient(ing.name)
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(ing)
  }
  Array.from(map.values()).forEach((list) => {
    list.sort((a, b) => a.name.localeCompare(b.name))
  });

  const sorted = new Map<string, AggregatedIngredient[]>()
  for (const label of order) {
    if (map.has(label)) sorted.set(label, map.get(label)!)
  }
  return sorted
}

export function GroceryList() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    generateGroceryList()
  }, [weekStart])

  function getStorageKey() {
    return `${STORAGE_KEY_PREFIX}${format(weekStart, "yyyy-MM-dd")}`
  }

  // Load checked items from localStorage so they persist across page refresh
  useEffect(() => {
    if (typeof window === "undefined") return
    const key = getStorageKey()
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setCheckedItems(new Set(parsed))
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else {
      setCheckedItems(new Set())
    }
  }, [weekStart])

  function toggleChecked(itemKey: string) {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(itemKey)) {
      newChecked.delete(itemKey)
    } else {
      newChecked.add(itemKey)
    }
    setCheckedItems(newChecked)
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(), JSON.stringify(Array.from(newChecked)))
    }
  }

  function clearChecked() {
    setCheckedItems(new Set())
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey())
    }
  }

  async function generateGroceryList() {
    setLoading(true)
    
    // Match WeekCalendar exactly: start of week (Monday) to end of week (Sunday)
    const endDate = addDays(weekStart, 6)
    const startDateStr = format(weekStart, "yyyy-MM-dd")
    const endDateStr = format(endDate, "yyyy-MM-dd")

    console.log("=== Grocery List Query ===")
    console.log("Week Start (Monday):", weekStart.toISOString())
    console.log("Week End (Sunday):", endDate.toISOString())
    console.log("Start Date String:", startDateStr)
    console.log("End Date String:", endDateStr)
    console.log("Querying meal_plans table with plan_date column...")

    const { data: mealPlans, error: mealPlansError } = await supabase
      .from("meal_plans")
      .select("recipe_id, plan_date, meal_type")
      .gte("plan_date", startDateStr)
      .lte("plan_date", endDateStr)

    console.log("Meal Plans Query Result:", { mealPlans, error: mealPlansError })
    
    if (mealPlansError) {
      console.error("Error fetching meal plans:", mealPlansError)
      alert(`Error fetching meal plans: ${mealPlansError.message}`)
      setIngredients([])
      setLoading(false)
      return
    }

    if (!mealPlans || mealPlans.length === 0) {
      console.log("No meal plans found for this week")
      setIngredients([])
      setLoading(false)
      return
    }

    console.log(`Found ${mealPlans.length} meal plan(s) for this week`)
    const recipeIds = [...new Set(mealPlans.map((m) => m.recipe_id))]
    console.log("Unique Recipe IDs:", recipeIds)

    if (recipeIds.length === 0) {
      console.log("No recipe IDs found")
      setIngredients([])
      setLoading(false)
      return
    }

    console.log("Fetching ingredients for recipe IDs:", recipeIds)
    const { data: ingredientsData, error: ingredientsError } = await supabase
      .from("recipe_ingredients")
      .select("*")
      .in("recipe_id", recipeIds)

    console.log("Ingredients Query Result:", { 
      count: ingredientsData?.length || 0, 
      ingredients: ingredientsData,
      error: ingredientsError 
    })

    if (ingredientsError) {
      console.error("Error fetching ingredients:", ingredientsError)
      alert(`Error fetching ingredients: ${ingredientsError.message}`)
      setIngredients([])
      setLoading(false)
      return
    }

    if (!ingredientsData || ingredientsData.length === 0) {
      console.log("No ingredients found for these recipes")
      setIngredients([])
      setLoading(false)
      return
    }

    console.log(`Found ${ingredientsData.length} ingredient(s) across all recipes`)
    const aggregated = new Map<string, AggregatedIngredient>()

    for (const plan of mealPlans) {
      const recipeIngredients = ingredientsData.filter(
        (i) => i.recipe_id === plan.recipe_id
      )
      console.log(`Recipe ${plan.recipe_id} has ${recipeIngredients.length} ingredient(s)`)
      
      for (const ing of recipeIngredients) {
        const key = `${ing.name.toLowerCase().trim()}|${ing.unit.toLowerCase()}`

        if (aggregated.has(key)) {
          const existing = aggregated.get(key)!
          existing.amount += ing.amount
          console.log(`Aggregating: ${ing.name} - adding ${ing.amount} ${ing.unit} to existing ${existing.amount} ${existing.unit}`)
        } else {
          aggregated.set(key, {
            name: ing.name,
            amount: ing.amount,
            unit: ing.unit,
          })
          console.log(`New ingredient: ${ing.amount} ${ing.unit} ${ing.name}`)
        }
      }
    }

    const finalIngredients = Array.from(aggregated.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    
    console.log(`Final aggregated list: ${finalIngredients.length} unique ingredient(s)`)
    console.log("Final ingredients:", finalIngredients)

    setIngredients(finalIngredients)
    setLoading(false)
  }

  function formatAmount(amount: number, unit: string): string {
    if (amount % 1 === 0) return `${amount} ${unit}`
    return `${amount.toFixed(2)} ${unit}`
  }

  function getCopyText(): string {
    const lines: string[] = []
    for (const [category, items] of groupByCategory(ingredients).entries()) {
      lines.push(`\n${category}`)
      for (const ing of items) {
        lines.push(
          ing.unit === "unit"
            ? `  • ${ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)} ${ing.name}`
            : `  • ${formatAmount(ing.amount, ing.unit)} ${ing.name}`
        )
      }
    }
    return lines.join("\n").trim()
  }

  async function copyToClipboard() {
    if (ingredients.length === 0) return
    const text = getCopyText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
      alert("Could not copy to clipboard. Please select and copy the list manually.")
    }
  }

  function printList() {
    if (ingredients.length === 0) return
    const weekRange = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
    const listItems = ingredients
      .map(
        (ing) =>
          `<tr>
            <td style="border-bottom: 1px solid #ddd; padding: 8px 12px; width: 40px;">☐</td>
            <td style="border-bottom: 1px solid #ddd; padding: 8px 12px;">${ing.name}</td>
            <td style="border-bottom: 1px solid #ddd; padding: 8px 12px; text-align: right;">${formatAmount(ing.amount, ing.unit)}</td>
          </tr>`
      )
      .join("")

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Grocery List – ${weekRange}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; color: #000; background: #fff; padding: 24px; }
    h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .week { font-size: 14px; color: #333; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Grocery List</h1>
  <p class="week">Week of ${weekRange}</p>
  <table>
    <thead>
      <tr>
        <th style="text-align: left; border-bottom: 2px solid #000; padding: 8px 12px; width: 40px;"></th>
        <th style="text-align: left; border-bottom: 2px solid #000; padding: 8px 12px;">Item</th>
        <th style="text-align: right; border-bottom: 2px solid #000; padding: 8px 12px;">Quantity</th>
      </tr>
    </thead>
    <tbody>${listItems}</tbody>
  </table>
</body>
</html>`

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      alert("Please allow pop-ups to print the grocery list.")
      return
    }
    printWindow.document.write(printHtml)
    printWindow.document.close()
    printWindow.focus()
    // Allow document to render, then open print dialog
    setTimeout(() => {
      printWindow.print()
      printWindow.onafterprint = () => printWindow.close()
    }, 250)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            ← Prev
          </Button>
          <span className="font-semibold min-w-[180px] text-center">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d")}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            Next →
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
          }
        >
          This Week
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Grocery List
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Aggregated from all meals planned for this week
              </p>
            </div>
            {ingredients.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={printList}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : ingredients.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              No meals planned for this week. Add recipes to your week view to
              generate a grocery list.
            </p>
          ) : (
            <>
              {checkedItems.size > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearChecked}
                    className="text-xs"
                  >
                    Clear checked
                  </Button>
                </div>
              )}
              <div className="space-y-6">
                {Array.from(groupByCategory(ingredients).entries()).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 pb-1 border-b">
                      {category}
                    </h3>
                    <ul className="space-y-2">
                      {items.map((ing) => {
                        const itemKey = `${ing.name}|${ing.unit}`
                        const isChecked = checkedItems.has(itemKey)
                        return (
                          <li
                            key={itemKey}
                            className={`flex items-center gap-3 py-3 px-4 rounded-lg border transition-all cursor-pointer touch-manipulation ${
                              isChecked
                                ? "bg-emerald-50 border-emerald-200 line-through opacity-60"
                                : "bg-card hover:bg-accent/50 border-border active:bg-accent"
                            }`}
                            onClick={() => toggleChecked(itemKey)}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => toggleChecked(itemKey)}
                              className="shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <span
                                className={`font-medium text-base sm:text-lg ${
                                  isChecked ? "text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {ing.name}
                              </span>
                            </div>
                            <span
                              className={`text-sm sm:text-base font-semibold shrink-0 ${
                                isChecked ? "text-muted-foreground" : "text-primary"
                              }`}
                            >
                              {formatAmount(ing.amount, ing.unit)}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>
              {ingredients.length > 0 && (
                <div className="mt-4 pt-4 border-t text-sm text-muted-foreground text-center">
                  {checkedItems.size} of {ingredients.length} items checked
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
