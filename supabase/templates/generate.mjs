// Generates Supabase Auth email templates in PicKet's paper style (inline CSS for email clients).
import { writeFileSync, mkdirSync } from "node:fs";
const out = process.argv[2];
mkdirSync(out, { recursive: true });

const font = "Nunito,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const c = { canvas: "#fff8ed", card: "#ffffff", ink: "#302132", muted: "#72636e", mauve: "#793268", chip: "#fde6d8", line: "#eaddd5", mint: "#bce0b4", coral: "#ffb4a2" };

const code = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
  <tr><td style="background:${c.chip};border:1px dashed ${c.coral};border-radius:16px;padding:16px 28px;font-family:${font};font-size:32px;line-height:40px;font-weight:800;letter-spacing:10px;color:${c.mauve}">{{ .Token }}</td></tr>
</table>`;

const button = (label) => `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
  <tr><td style="background:${c.mauve};border-radius:999px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 32px;font-family:${font};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">${label}</a></td></tr>
</table>
<p style="margin:0 0 16px;font-size:13px;line-height:20px;color:${c.muted}">Nếu nút không mở được, sao chép đường dẫn này vào trình duyệt:<br><a href="{{ .ConfirmationURL }}" style="color:${c.mauve};word-break:break-all">{{ .ConfirmationURL }}</a></p>`;

const layout = ({ preheader, eyebrow, title, intro, body, note }) => `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${c.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.canvas}">
  <tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
      <tr><td style="padding:0 4px 20px">
        <img src="https://picketfinance.com/launch-assets/picket-logo-192.png" width="64" height="64" alt="PicKet" style="display:block;border:0">
      </td></tr>
      <tr><td style="background:${c.card};border:1px solid ${c.line};border-radius:24px;padding:32px 28px;font-family:${font};color:${c.ink}">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${c.mauve}">${eyebrow}</p>
        <h1 style="margin:0 0 12px;font-size:26px;line-height:32px;font-weight:800;color:${c.ink}">${title}</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${c.ink}">${intro}</p>
        ${body}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:2px dashed ${c.line};padding-top:16px;font-size:13px;line-height:20px;color:${c.muted}">${note}</td></tr></table>
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-family:${font};font-size:12px;line-height:18px;color:${c.muted}">
        PicKet · Quản lý chi tiêu cá nhân<br>
        Email này được gửi tự động, vui lòng không trả lời. Cần hỗ trợ: <a href="mailto:picketfinance@gmail.com" style="color:${c.mauve}">picketfinance@gmail.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;

const ignore = "Nếu bạn không yêu cầu, hãy bỏ qua email này. Không chia sẻ mã cho bất kỳ ai, kể cả người tự xưng là PicKet.";

const templates = {
  "confirm-signup": {
    subject: "Mã xác minh PicKet: {{ .Token }}",
    html: layout({ preheader: "Mã 6 số để tạo tài khoản PicKet, hiệu lực 15 phút.", eyebrow: "Tạo tài khoản", title: "Xác minh email của bạn", intro: "Nhập mã dưới đây vào PicKet để xác minh email. Sau đó bạn sẽ tạo mật khẩu cho tài khoản.", body: code, note: `Mã có hiệu lực trong 15 phút. ${ignore}` }),
  },
  "magic-link-or-otp": {
    subject: "Mã xác minh PicKet: {{ .Token }}",
    html: layout({ preheader: "Mã 6 số của bạn, hiệu lực 15 phút.", eyebrow: "Mã xác minh", title: "Mã xác minh của bạn", intro: "Nhập mã dưới đây vào ứng dụng hoặc trang web PicKet để tiếp tục.", body: code, note: `Mã có hiệu lực trong 15 phút. ${ignore}` }),
  },
  "reset-password": {
    subject: "Đặt lại mật khẩu PicKet",
    html: layout({ preheader: "Đặt mật khẩu mới cho tài khoản PicKet.", eyebrow: "Khôi phục tài khoản", title: "Đặt lại mật khẩu", intro: "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản {{ .Email }}. Bấm nút dưới đây để chọn mật khẩu mới.", body: button("Đặt mật khẩu mới"), note: "Đường dẫn chỉ dùng được một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này; mật khẩu hiện tại vẫn giữ nguyên." }),
  },
  "change-email-address": {
    subject: "Xác nhận email mới cho PicKet",
    html: layout({ preheader: "Xác nhận đổi email đăng nhập PicKet.", eyebrow: "Đổi email", title: "Xác nhận email mới", intro: "Bấm nút dưới đây để đổi email đăng nhập từ {{ .Email }} sang {{ .NewEmail }}.", body: button("Xác nhận email mới"), note: `Nếu bạn không đổi email, hãy đổi mật khẩu ngay và liên hệ hỗ trợ.` }),
  },
  "reauthentication": {
    subject: "Mã xác nhận thao tác PicKet: {{ .Token }}",
    html: layout({ preheader: "Mã 6 số để xác nhận thao tác quan trọng.", eyebrow: "Xác nhận thao tác", title: "Xác nhận đó là bạn", intro: "Nhập mã dưới đây để tiếp tục thao tác quan trọng trên tài khoản PicKet.", body: code, note: ignore }),
  },
  "invite-user": {
    subject: "Bạn được mời dùng PicKet",
    html: layout({ preheader: "Lời mời tham gia PicKet.", eyebrow: "Lời mời", title: "Bạn được mời dùng PicKet", intro: "Bấm nút dưới đây để nhận lời mời và tạo tài khoản PicKet.", body: button("Nhận lời mời"), note: "Nếu bạn không mong đợi lời mời này, hãy bỏ qua email." }),
  },
};

const subjects = {};
for (const [name, t] of Object.entries(templates)) {
  writeFileSync(`${out}/${name}.html`, t.html);
  subjects[name] = t.subject;
}
writeFileSync(`${out}/subjects.json`, JSON.stringify(subjects, null, 2) + "\n");
console.log(Object.keys(templates).join(", "));
