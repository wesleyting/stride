import { DesktopNavigation, MobileNavigation } from "@/components/stride/app-navigation";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  showSidebar = false,
  sidebarFooter,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-screen bg-stone-100 md:p-6", showSidebar && "pb-16 md:pb-6")}>
      <div
        className={cn(
          "mx-auto min-h-screen overflow-hidden bg-background md:min-h-[calc(100vh-3rem)] md:rounded-lg md:border md:border-stone-300 md:shadow-sm",
          showSidebar ? "max-w-7xl md:flex" : "max-w-6xl",
        )}
      >
        {showSidebar ? <DesktopNavigation footer={sidebarFooter} /> : null}
        {children}
      </div>
      {showSidebar ? <MobileNavigation /> : null}
    </div>
  );
}
