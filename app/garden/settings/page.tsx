import TopNav from "@/components/TopNav";
import ComingSoon from "../_components/ComingSoon";

export default function Page() {
  return (
    <>
      <TopNav showBack showHome />
      <div className="pt-16">
        <ComingSoon title="Settings" />
      </div>
    </>
  );
}
