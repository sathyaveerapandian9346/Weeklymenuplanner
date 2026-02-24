"use client"

import { GroceryList } from "@/components/grocery-list"
import Link from "next/link"
import { ArrowLeft, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GroceryListPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60">
      <div className="container mx-auto px-4 py-4 sm:py-6 max-w-2xl">
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4 -ml-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Planner
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-600" />
            <h1 className="text-2xl sm:text-3xl font-bold text-emerald-800 tracking-tight">
              Grocery List
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-9 sm:ml-11">
            Tap items to check them off as you shop
          </p>
        </div>

        <GroceryList />
      </div>
    </main>
  )
}
