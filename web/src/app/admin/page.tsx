import { AdminModule } from "@/features/admin/components/admin-module";
import {requireApiSession} from '@/core/auth/require-api-session';
import {adminSections,canViewAdminSection,type AdminSection} from '@/features/admin/admin-permissions';
import {redirect} from 'next/navigation';

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
  const {role,permissions}=await requireApiSession('admin');
  if(!canViewAdminSection(role,'overview',permissions)) {
    const first=(Object.keys(adminSections) as AdminSection[]).find(section=>canViewAdminSection(role,section,permissions));
    if(first)redirect(adminSections[first].href);
  }
  return <AdminModule section="overview" searchParams={searchParams}/>;
}
