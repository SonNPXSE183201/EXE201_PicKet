import { AdminScreen } from "../admin-screen";
export const metadata = { title: "Quản lý người dùng · Picket" };
export default function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; done?: string }>;
}) {
  return <AdminScreen searchParams={searchParams} usersOnly />;
}
