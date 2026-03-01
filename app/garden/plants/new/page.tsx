import TopNav from "../../_components/TopNav";
import Link from "next/link";
import NewPlantForm from "./NewPlantForm";

export default function NewPlantPage() {
  return (
    <>
      <TopNav title="Add Plant" showBack />
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto w-full max-w-[720px] px-4 py-6">
          <div className="rounded-lg border border-white/10 bg-white/5 p-5">
            <NewPlantForm />
          </div>
          <p className="mt-4 text-center">
            <Link href="/garden/plants" className="text-white/70 hover:text-white text-sm underline">
              Back to Plants
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
