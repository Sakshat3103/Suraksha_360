import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { SosListener } from "@/components/dashboard/sos-listener";
import { SosOverlay } from "@/components/dashboard/sos-overlay";
import { AICopilot } from "@/components/dashboard/ai-copilot";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <SosListener />
      <SosOverlay />
      <AICopilot />
    </div>
  );
}
