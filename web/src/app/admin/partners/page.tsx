import { requireApiSession } from '@/core/auth/require-api-session';
import { createClient } from '@/core/supabase/server';
import { saveAd } from '../settings-actions';

function AdForm({ad}:{ad?:{id:string;title:string;body:string;url:string;active:boolean}}) {
  return <form action={saveAd} className="finance-form"><input type="hidden" name="id" value={ad?.id??''}/><label>Tiêu đề<input name="title" required maxLength={120} defaultValue={ad?.title}/></label><label>Nội dung<textarea name="body" maxLength={500} rows={3} defaultValue={ad?.body}/></label><label>Liên kết HTTPS<input name="url" type="url" required defaultValue={ad?.url}/></label><label className="checkbox-label"><input type="checkbox" name="active" defaultChecked={ad?.active??false}/>Hiển thị cho người dùng đủ điều kiện</label><label>Nhập SAVE để xác nhận<input name="confirmation" pattern="SAVE" required autoComplete="off"/></label><button className="button primary" type="submit">Lưu nội dung</button></form>;
}
export default async function PartnersPage({searchParams}:{searchParams:Promise<{error?:string;done?:string}>}) {
  await requireApiSession('admin');
  const client=await createClient();
  const {data,error}=await client.from('partner_ads').select('id,title,body,url,active').order('created_at',{ascending:false});
  if(error) throw new Error('Chưa tải được nội dung đối tác.');
  const query=await searchParams;
  return <main className="admin-shell shell"><header className="admin-header"><div><h1 className="finance-title">Nội dung đối tác</h1><p>Kiểm tra nội dung và đường dẫn trước khi cho hiển thị.</p></div></header>{query.error&&<p role="alert" className="mutation-error">Chưa lưu được. Kiểm tra nội dung và xác nhận.</p>}{query.done&&<p role="status" className="admin-success">Đã lưu nội dung đối tác.</p>}<section className="finance-columns"><article className="finance-panel"><h2>Tạo nội dung</h2><AdForm/></article><div className="finance-stack">{(data??[]).map(ad=><article className="resource-card" key={ad.id}><h2>{ad.title}</h2><p>{ad.active?'Đang bật':'Đang tắt'}</p><details><summary>Chỉnh sửa</summary><AdForm ad={ad}/></details></article>)}{!data?.length&&<p className="empty-state">Chưa có nội dung đối tác.</p>}</div></section></main>;
}
