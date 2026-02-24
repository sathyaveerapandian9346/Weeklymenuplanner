"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeekCalendar } from "@/components/week-calendar"
import { RecipeLibrary } from "@/components/recipe-library"
import { GroceryList } from "@/components/grocery-list"

export default function Home() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [recipeRefreshKey, setRecipeRefreshKey] = useState(0)

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-emerald-800 tracking-tight">
            Weekly Menu Planner
          </h1>
          <p className="mt-2 text-muted-foreground">
            Plan your meals, manage recipes, and generate grocery lists
          </p>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
            <TabsTrigger value="calendar" className="text-sm sm:text-base">
              Week View
            </TabsTrigger>
            <TabsTrigger value="recipes" className="text-sm sm:text-base">
              Recipe Library
            </TabsTrigger>
            <TabsTrigger value="grocery" className="text-sm sm:text-base">
              Grocery List
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-0">
            <WeekCalendar key={recipeRefreshKey} />
          </TabsContent>

          <TabsContent value="recipes" className="mt-0">
            <RecipeLibrary
              onRecipeAdded={() => {
                setRecipeRefreshKey((k) => k + 1)
              }}
            />
          </TabsContent>

          <TabsContent value="grocery" className="mt-0">
            <GroceryList />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
