import { Suspense } from "react";
import { ListSkeleton } from "@/components/ui";
import { UsersList } from "@/components/users-list";

export const metadata = { title: "Users" };

export default function UsersPage() {
  return <Suspense fallback={<ListSkeleton rows={8} />}><UsersList /></Suspense>;
}
