"use client"

import * as React from "react"
import { Search, X } from "lucide-react"

import { cn } from "@/lib/utils"

type SearchFieldProps = Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value: string
  onValueChange: (value: string) => void
}

/** Pill search input with a leading icon and a clear button. */
export function SearchField({ value, onValueChange, placeholder = "Search", className, ...props }: SearchFieldProps) {
  return (
    <div
      className={cn(
        "flex h-11 items-center gap-2 rounded-full bg-raised px-4 text-foreground focus-within:ring-3 focus-within:ring-ring/40 md:h-10",
        className
      )}
    >
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        {...props}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onValueChange("")}
          className="flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
