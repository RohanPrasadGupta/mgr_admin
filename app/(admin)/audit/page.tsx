import { Suspense } from "react";
import { AuditView } from "@/components/audit-view";
import { ListSkeleton } from "@/components/ui";

export const metadata = { title: "Audit log" };

export default function AuditPage() {
  return <Suspense fallback={<ListSkeleton rows={8} />}><AuditView /></Suspense>;
}
