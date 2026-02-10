import { Button } from "@/components/ui/button";
import { Leaf, WheatOff, Flame, UtensilsCrossed } from "lucide-react";

export type DietaryFilter = "all" | "vegan" | "vegetarian" | "glutenFree" | "spicy";

interface DietaryFiltersProps {
  activeFilter: DietaryFilter;
  onFilterChange: (filter: DietaryFilter) => void;
}

const filters: { id: DietaryFilter; label: string; icon: typeof Leaf }[] = [
  { id: "all", label: "All", icon: UtensilsCrossed },
  { id: "vegan", label: "Vegan", icon: Leaf },
  { id: "vegetarian", label: "Vegetarian", icon: Leaf },
  { id: "glutenFree", label: "Gluten-Free", icon: WheatOff },
  { id: "spicy", label: "Spicy", icon: Flame },
];

export default function DietaryFilters({
  activeFilter,
  onFilterChange,
}: DietaryFiltersProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {filters.map((filter) => {
        const Icon = filter.icon;
        const isActive = activeFilter === filter.id;
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="whitespace-nowrap flex-shrink-0"
            data-testid={`button-filter-${filter.id}`}
          >
            <Icon className="w-4 h-4 mr-1" />
            {filter.label}
          </Button>
        );
      })}
    </div>
  );
}
