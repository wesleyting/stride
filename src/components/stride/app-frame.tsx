import { ViewTransition } from "react";
import { DesktopNavigation, MobileNavigation } from "@/components/stride/app-navigation";
import { ScrollPane } from "@/components/ui/scroll-pane";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  showSidebar = true,
  sidebarFooter,
}: {
  children: React.ReactNode;
  showSidebar?: boolean;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className={cn("min-h-screen bg-stone-100 md:h-dvh md:min-h-0 md:overflow-hidden md:p-4 xl:p-6", showSidebar && "pb-16 md:pb-4 xl:pb-6")}>
      <div
        className={cn(
          "mx-auto min-h-screen overflow-hidden bg-background md:h-full md:min-h-0 md:rounded-lg md:border md:border-stone-300 md:shadow-sm",
          showSidebar ? "max-w-[82rem] md:flex" : "max-w-6xl",
        )}
      >
        {showSidebar ? <DesktopNavigation footer={sidebarFooter} /> : null}
        <ViewTransition
          name="stride-page-content"
          share="stride-page"
          enter="stride-page-enter"
          exit="stride-page-exit"
          default="none"
        >
          <ScrollPane className={cn("min-w-0 flex-1", showSidebar && "md:h-full md:min-h-0")} viewportClassName={cn(showSidebar && "md:h-full md:overflow-y-auto md:overscroll-contain")}>
            {children}
          </ScrollPane>
        </ViewTransition>
      </div>
      {showSidebar ? <MobileNavigation /> : null}
    </div>
  );
}
