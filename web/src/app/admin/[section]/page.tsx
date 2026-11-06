import { notFound } from "next/navigation";
import { AdminModule } from "@/features/admin/components/admin-module";
import {
  adminSections,
  type AdminSection,
} from "@/features/admin/admin-permissions";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { section } = await params;
  if (!Object.hasOwn(adminSections, section)) notFound();
  return (
    <AdminModule
      section={section as AdminSection}
      searchParams={searchParams}
    />
  );
}
