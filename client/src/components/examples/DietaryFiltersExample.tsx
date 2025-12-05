import { useState } from "react";
import DietaryFilters, { type DietaryFilter } from "../menu/DietaryFilters";

export default function DietaryFiltersExample() {
  const [activeFilter, setActiveFilter] = useState<DietaryFilter>("all");

  return (
    <div className="w-full max-w-md">
      <DietaryFilters
        activeFilter={activeFilter}
        onFilterChange={(filter) => {
          setActiveFilter(filter);
          console.log("Filter changed:", filter);
        }}
      />
    </div>
  );
}
