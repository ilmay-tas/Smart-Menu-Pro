import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "./OrderTicket";

type FilterOption = "all" | OrderStatus;

interface OrderFiltersProps {
  activeFilter: FilterOption;
  onFilterChange: (filter: FilterOption) => void;
  counts: Record<OrderStatus, number>;
}

const filters: { id: FilterOption; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "in_progress", label: "In Progress" },
  { id: "ready", label: "Ready" },
];

export default function OrderFilters({
  activeFilter,
  onFilterChange,
  counts,
}: OrderFiltersProps) {
  const getTotalCount = () => {
    return Object.values(counts).reduce((sum, count) => sum + count, 0);
  };

  const getCount = (filter: FilterOption) => {
    if (filter === "all") return getTotalCount();
    return counts[filter] || 0;
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const count = getCount(filter.id);
        return (
          <Button
            key={filter.id}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange(filter.id)}
            className="whitespace-nowrap flex-shrink-0"
            data-testid={`button-order-filter-${filter.id}`}
          >
            {filter.label}
            {count > 0 && (
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className="ml-2"
              >
                {count}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );
}
