import { UserDetail } from "@/components/user-detail";

export const metadata = { title: "User" };

export default async function UserPage({ params }: PageProps<"/users/[id]">) {
  const { id } = await params;
  return <UserDetail id={id} />;
}
