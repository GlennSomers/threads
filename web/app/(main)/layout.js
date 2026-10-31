"use client";

import { usePathname } from "next/navigation";
import { DraftsProvider } from "../drafts-context";
import DraftList from "../draft-list";
import ComposeSheet from "../compose-sheet";

export default function MainLayout({ children }) {
  const pathname = usePathname() || "/";
  const onDetail = pathname.startsWith("/d/");

  return (
    <DraftsProvider>
      <div className="split" data-detail={onDetail ? "true" : "false"}>
        <aside className="pane sidebar" aria-label="Drafts">
          <DraftList activeSlug={onDetail ? decodeURIComponent(pathname.slice(3)) : ""} />
        </aside>
        <main className="pane detail">{children}</main>
      </div>
      <ComposeSheet />
    </DraftsProvider>
  );
}
