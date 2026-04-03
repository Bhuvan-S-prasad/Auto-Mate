import Sidebar from "@/components/Sidebar";

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 w-full md:pl-64">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}