import KPICard from "../dashboard/KPICard";
import { DollarSign } from "lucide-react";

export default function KPICardExample() {
  return (
    <div className="w-64">
      <KPICard
        title="Total Revenue"
        value="$12,450"
        icon={<DollarSign className="w-6 h-6" />}
        trend={{ value: 12.5, isPositive: true }}
        subtitle="vs last week"
      />
    </div>
  );
}
