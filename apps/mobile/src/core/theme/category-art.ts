import type { PaperAssetId } from "./paper-assets";

/** Illustration is decoration only; the category's actual name remains visible. */
export function categoryArt(icon: string | null, name = ""): PaperAssetId {
  const key = `${icon ?? ""} ${name}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();
  if (/bonus|thuong|tien thuong/.test(key)) return "bonus";
  if (/invest|dau tu|chung khoan/.test(key)) return "investment";
  if (/salary|luong|tien luong|thu nhap/.test(key)) return "salary";
  if (/food|restaurant|an uong|an sang|an trua|an toi|com|pho/.test(key)) return "food";
  if (/coffee|ca phe|cafe|tra sua/.test(key)) return "cafe";
  if (/groceries|sieu thi|tap hoa|di cho|bach hoa/.test(key)) return "groceries";
  if (/bus|car|bike|train|transport|di chuyen|di lai|xang|grab|\bbe\b/.test(key)) return "transport";
  if (/vehicle|sua xe|rua xe|bao duong xe/.test(key)) return "vehicle";
  if (/medical|health|hospital|suc khoe|thuoc|benh|kham|nha khoa/.test(key)) return "health";
  if (/fitness|gym|yoga|the thao/.test(key)) return "fitness";
  if (/beauty|spa|cat toc|nail|my pham/.test(key)) return "beauty";
  if (/pet|thu cung|cho|meo/.test(key)) return "pet";
  if (/education|hoc phi|hoc tap|sach|truong hoc/.test(key)) return "education";
  if (/bill|hoa don|dien|nuoc|internet|tien dien|tien nuoc/.test(key)) return "bills";
  if (/savings|tiet kiem|tich luy/.test(key)) return "savings";
  if (/security|bao hiem/.test(key)) return "security";
  if (/gift|qua tang|mung/.test(key)) return "gift";
  if (/home|house|nha|tien nha|thue nha/.test(key)) return "home";
  if (/movie|game|gaming|leisure|giai tri|du lich|phim|cinema/.test(key)) return "leisure";
  if (/music|am nhac|nhac/.test(key)) return "music";
  return "shopping";
}
