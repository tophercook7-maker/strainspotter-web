import HeroEmblemCard from "@/components/dashboard/HeroEmblemCard";

import DashboardStatGrid from "@/components/dashboard/DashboardStatGrid";

import MemberLimitsCard from "@/components/dashboard/MemberLimitsCard";

import "@/app/dashboard/dashboard.css";



export default function MemberDashboard() {

  return (

    <div className="dashboard-cinematic">

      {/* Atmosphere layers */}

      <div className="aurora-layer member-aurora"></div>

      <div className="particle-field member-particles"></div>



      <div className="dashboard-inner">

        <HeroEmblemCard />



        <DashboardStatGrid />



        <MemberLimitsCard />

      </div>

    </div>

  );

}
