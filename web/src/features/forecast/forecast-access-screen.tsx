import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/core/ui/workspace-icon";
import { Notice } from "@/core/ui/notice";

export function ForecastAccessScreen({ signedOut = false }: { signedOut?: boolean }) {
  return <div className="fc-upgrade">
    <section className="fc-hero fc-intro"><Image src={signedOut ? "/paper/receipt-v2.webp" : "/paper/month-close-scene-v1.webp"} alt="" width={80} height={80} /><div className="fc-hero-copy"><p className="fc-hero-label">{signedOut ? "DÙNG TRÊN THIẾT BỊ" : "CÓ TRONG GÓI PLUS VÀ PRO"}</p><h2>{signedOut ? "Đăng nhập để xem dự báo" : "Biết trước cuối tháng còn bao nhiêu"}</h2><p>{signedOut ? "Dự báo cuối tháng dành cho tài khoản Plus và Pro nên chưa có con số nào ở đây." : "Dự báo từ ghi chép của chính bạn, kèm cảnh báo ngày có thể thiếu tiền."}</p></div></section>
    <div className="fc-col">
      {signedOut ? <Notice title="Dữ liệu vẫn ở trên máy" body="Đăng nhập không làm mất giao dịch bạn đã ghi." /> : <>
        <section className="fc-card fc-benefits"><p className="fc-eyebrow">BẠN SẼ CÓ</p>{['Số dư dự kiến cuối tháng và khoảng dao động', 'Cảnh báo sớm ngày có thể thiếu tiền', 'Pro: kịch bản "Nếu tôi mua…?" trước khi chi lớn'].map(text => <p key={text}><span><Icon name="check" /></span>{text}</p>)}</section>
        <div className="fc-plans">{[{name: "Plus", art: "save-jar-v1", body: "Dự báo cuối tháng"}, {name: "Pro", art: "money-bloom-scene-v1", body: "Thêm kịch bản mua"}].map(plan => <div className={`fc-plan fc-plan-${plan.name.toLowerCase()}`} key={plan.name}><Image src={`/paper/${plan.art}.webp`} alt="" width={84} height={84} /><b>{plan.name}</b><p>{plan.body}</p></div>)}</div>
      </>}
      <div className="fc-actions"><Link className="button primary" href={signedOut ? "/login" : "/billing"}>{signedOut ? "Đăng nhập" : "Xem các gói Picket"}</Link><Link className="fc-link" href={signedOut ? "/register" : "/dashboard"}>{signedOut ? "Tạo tài khoản mới" : "Để sau"}</Link></div>
    </div>
  </div>;
}
