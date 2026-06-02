"use client";

import Header from "@/components/layout/Header";
import HealthBand from "@/components/dashboard/HealthBand";
import HeroMetrics from "@/components/dashboard/HeroMetrics";
import PerSourceTable from "@/components/dashboard/PerSourceTable";
import EquityCurveChart from "@/components/dashboard/EquityCurveChart";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import CommissionSaved from "@/components/dashboard/CommissionSaved";

export default function DashboardPage() {
  return (
    <div>
      <Header title="Dashboard" />
      <div className="mt-6 space-y-6">

        <HealthBand />
        <HeroMetrics />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column — equity curve + per-source breakdown */}
          <div className="lg:col-span-2 space-y-6">
            <EquityCurveChart />
            <PerSourceTable />
          </div>

          {/* Right column — live activity + commission counter */}
          <div className="space-y-6">
            <ActivityFeed />
            <CommissionSaved />
          </div>
        </div>

      </div>
    </div>
  );
}
