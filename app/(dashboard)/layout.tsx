import FloatingSidebar from '@/components/FloatingSidebar';
import Header from '@/components/Header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <FloatingSidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-[88px]">
        <Header />
        <main className="flex-1 overflow-y-auto bg-[#0A0A0A]">
          {children}
        </main>
      </div>
    </div>
  );
}
