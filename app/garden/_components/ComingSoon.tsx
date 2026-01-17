export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center py-32">
      <h1 className="text-3xl font-semibold text-green-400 mb-4">{title}</h1>
      <p className="opacity-70">Coming soon</p>
    </div>
  );
}
