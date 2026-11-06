import { AdminModule } from "@/features/admin/components/admin-module";

export default function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  return <AdminModule section="settings" searchParams={searchParams}/>;
}
