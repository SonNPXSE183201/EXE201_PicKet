import { AdminScreen } from "./admin-screen";
export const metadata = { title: "Quản trị Picket" };
export default function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; done?: string }>;
}) {
  return <AdminScreen searchParams={searchParams} />;
}
