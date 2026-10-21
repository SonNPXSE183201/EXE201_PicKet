import { requireApiSession } from '@/core/auth/require-api-session';
import { createClient } from '@/core/supabase/server';
export default async function OcrAdminPage() {
  await requireApiSession('admin');
  const client=await createClient();
  const {data,error}=await client.rpc('admin_overview',{page_number:100000});
  if(error) throw new Error('Chưa tải được thống kê nhận diện.');
  const rows=(data?.ocr??[]) as Array<{day:string;scans:number;successful:number;average_ms:number}>;
  return <main className="admin-shell shell"><header className="admin-header"><h1 className="finance-title">Nhận diện hóa đơn</h1></header><section className="data-panel"><h2>Hiệu quả trong 30 ngày</h2><p>Thống kê kết quả xử lý; không hiển thị ảnh hoặc nội dung hóa đơn của người dùng.</p><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ngày</th><th>Lượt quét</th><th>Thành công</th><th>Thời gian trung bình</th></tr></thead><tbody>{rows.map(row=><tr key={row.day}><td>{new Date(row.day).toLocaleDateString('vi-VN')}</td><td>{row.scans}</td><td>{row.successful}</td><td>{row.average_ms} ms</td></tr>)}</tbody></table></div>{!rows.length&&<p className="empty-state">Chưa có lượt quét trong kỳ.</p>}</section></main>;
}
