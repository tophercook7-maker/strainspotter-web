import InventoryDashboard from "@/components/inventory/InventoryDashboard";
import GrowerDashboardLayout from "@/components/dashboard/GrowerDashboardLayout";

export default function GrowerInventoryPage() {
  return (
    <GrowerDashboardLayout>
      <div className="min-h-screen bg-black/60 text-green-100 p-6">
        <InventoryDashboard />
      </div>
    </GrowerDashboardLayout>
  );
}
