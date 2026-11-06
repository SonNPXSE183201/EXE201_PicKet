import { DateField } from "../ui/date-field";
import Link from "next/link";
import { formatVnd } from "@picket/domain";
import { requireApiSession } from "@/core/auth/require-api-session";
import { SubmitButton } from "@/core/ui/submit-button";
import { adjustRevenue } from "../payment-actions";
import { AdminIcon } from "../ui/admin-icon";
import { Banner, Button, Card, Chip, Drawer, Field, Kpi, Table, formatDateTime, type ChipTone, type Column } from "../ui/paper";
import "./modules.css";

type Query = Record<string, string | undefined>;
type Summary = {
  confirmedVnd: number;
  estimatedVnd: number;
  reviewVnd: number;
  unconverted: { currency: string; amount: number }[];
  bySource: {
    source: string;
    name: string;
    enabled: boolean;
    confirmed: number;
    estimated: number;
    charges: number;
    refunded: number;
  }[];
  series: { period: string; source: string; amount: number; entries: number }[];
};
type Entry = {
  id: number;
  source: string;
  kind: string;
  status: string;
  external_ref: string;
  order_code: number | null;
  payment_order_id: string | null;
  user_id: string | null;
  sku: string | null;
  currency: string;
  amount_original: number;
  amount_vnd: number | null;
  is_test: boolean;
  occurred_at: string;
  revisions: number;
  note: string | null;
  evidence: Record<string, unknown>;
};

export const REVENUE_SOURCE_LABELS: Record<string, string> = {
  payos: "PayOS",
  google_play: "Google Play",
};
export const REVENUE_STATUS_LABELS: Record<string, string> = {
  confirmed: "Đã xác nhận",
  estimated: "Tạm tính",
  review: "Cần đối soát",
  reversed: "Đã đảo",
};
export const REVENUE_KIND_LABELS: Record<string, string> = {
  charge: "Thu",
  refund: "Hoàn tiền",
  chargeback: "Bồi hoàn",
  adjustment: "Điều chỉnh",
};
const FILTER_KEYS = ["source", "status", "kind", "ref", "from", "to"] as const;
const STATUS_TONES: Record<string, ChipTone> = { confirmed: "success", estimated: "warning", review: "danger", reversed: "outline" };
const SOURCE_COLORS: Record<string, string> = { google_play: "var(--ap-mint)", payos: "var(--ap-mauve)" };
const time = (value: string) => formatDateTime(value);
const periodLabel = (p: string) => {
  const m = p.match(/^\d{4}-(\d\d)-(\d\d)/);
  return m ? `${Number(m[2])}/${Number(m[1])}` : p.replace("T", " ");
};
const money = (e: Pick<Entry, "amount_vnd" | "amount_original" | "currency">) =>
  e.amount_vnd === null ? `${e.amount_original} ${e.currency}` : formatVnd(e.amount_vnd);
/** `datetime-local` (giờ Việt Nam) → ISO; giữ nguyên nếu đã có múi giờ. */
const toIso = (value: string) =>
  /(Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}:00+07:00`;

/* No Figma screen: designed in the language of Gói & thanh toán (KPI row, chart card, ledger table, side drawer). */
export async function RevenueAdmin({ query }: { query: Query }) {
  const { api, accessToken, mfaVerified } = await requireApiSession("admin");
  const filters: Record<string, string> = {};
  for (const key of FILTER_KEYS) {
    const value = query[key];
    if (value) filters[key] = key === "from" || key === "to" ? toIso(value) : value;
  }
  const [summary, list] = await Promise.all([
    api.adminRevenue<Summary>(accessToken, {
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
      bucket: query.bucket ?? "day",
    }),
    api.adminRevenue<{ entries: Entry[]; history: { id: number; changed_at: string; previous: Entry }[] }>(
      accessToken,
      { view: "entries", ...filters, ...(query.id ? { id: query.id } : {}) },
    ),
  ]);
  const exportQuery = new URLSearchParams(filters).toString();
  const closeHref = `/admin/revenue${exportQuery ? `?${exportQuery}` : ""}`;
  const selected = query.id ? list.entries.find((e) => String(e.id) === query.id) : undefined;
  const bySource = (source: string) => summary.bySource.find((s) => s.source === source);

  // Stacked columns: one per period, one segment per source.
  const periods = [...new Set(summary.series.map((r) => r.period))].sort();
  const sources = [...new Set(summary.series.map((r) => r.source))];
  const stacks = periods.map((period) => {
    const parts = sources.map((source) => ({
      source,
      amount: summary.series.filter((r) => r.period === period && r.source === source).reduce((t, r) => t + r.amount, 0),
    }));
    return { period, parts, total: parts.reduce((t, p) => t + p.amount, 0) };
  });
  const maxTotal = Math.max(1, ...stacks.map((c) => c.total));

  const columns: Column<Entry>[] = [
    { key: "id", label: "#", render: (e) => <Link className="am-link" href={`/admin/revenue?${new URLSearchParams({ ...filters, id: String(e.id) })}`}>{e.id}</Link> },
    { key: "occurred_at", label: "Thời điểm", render: (e) => time(e.occurred_at) },
    { key: "source", label: "Nguồn", render: (e) => <Chip tone={e.source === "payos" ? "lilac" : "coral"}>{REVENUE_SOURCE_LABELS[e.source] ?? e.source}</Chip> },
    { key: "kind", label: "Loại", render: (e) => REVENUE_KIND_LABELS[e.kind] ?? e.kind },
    { key: "status", label: "Trạng thái", render: (e) => <span className="ap-row" style={{ gap: 6 }}><Chip tone={STATUS_TONES[e.status] ?? "outline"}>{REVENUE_STATUS_LABELS[e.status] ?? e.status}</Chip>{e.is_test && <Chip tone="outline">Thử nghiệm</Chip>}</span> },
    { key: "amount", label: "Số tiền", align: "right", render: (e) => <b>{money(e)}</b> },
    { key: "ref", label: "Tham chiếu", render: (e) => <span className="am-ref">{e.order_code && e.payment_order_id ? <Link className="am-link" href={`/admin/payments?id=${e.payment_order_id}`}>#{e.order_code}</Link> : null}<code>{e.external_ref}</code></span> },
  ];

  return (
    <>
      <p className="ap-card-note am-lead">
        Tổng hợp mọi khoản thu từ Google Play và PayOS, theo VND. Chỉ cộng các khoản <strong>đã xác nhận</strong>, đã trừ hoàn tiền. Google
        Play được tạm tính theo giá gói cho tới khi báo cáo bán hàng của Google xác nhận. Giao dịch thử nghiệm được loại khỏi tổng.
      </p>

      <form className="ap-filter" method="get" aria-label="Lọc doanh thu">
        <Field label="Từ" width={190}><DateField type="datetime-local" name="from" defaultValue={query.from} /></Field>
        <Field label="Đến" width={190}><DateField type="datetime-local" name="to" defaultValue={query.to} /></Field>
        <Field label="Nguồn" width={140}>
          <select name="source" defaultValue={query.source ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_SOURCE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Trạng thái" width={140}>
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Loại" width={130}>
          <select name="kind" defaultValue={query.kind ?? ""}>
            <option value="">Tất cả</option>
            {Object.entries(REVENUE_KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
        <Field label="Mã tham chiếu / mã đơn" grow><input name="ref" defaultValue={query.ref} placeholder="GPA… hoặc mã PayOS" /></Field>
        <div className="am-actions">
          <button className="ap-btn" type="submit">Lọc</button>
          <a className="ap-btn is-secondary" href={`/api/admin/revenue/export?${exportQuery}`}><AdminIcon name="download" size={18} />Tải CSV</a>
        </div>
      </form>

      <section className="am-kpis" aria-label="Tổng doanh thu">
        <Kpi icon="cash" tone="mint" label="Đã xác nhận" value={formatVnd(summary.confirmedVnd)} note="Doanh thu, đã trừ hoàn tiền" />
        <Kpi icon="bag" tone="coral" label="Google Play" value={formatVnd(bySource("google_play")?.confirmed ?? 0)} note={`${bySource("google_play")?.charges ?? 0} khoản thu`} />
        <Kpi icon="wallet" tone="lilac" label="PayOS" value={formatVnd(bySource("payos")?.confirmed ?? 0)} note={`${bySource("payos")?.charges ?? 0} khoản thu`} />
        <Kpi icon="calendar" tone="blue" label="Tạm tính" value={formatVnd(summary.estimatedVnd)} note="Chờ báo cáo Google" />
        <Kpi icon="alert" tone="cream" label="Cần đối soát" value={formatVnd(summary.reviewVnd)} note="Trả thừa/trả hai lần, không tính doanh thu" />
      </section>
      {!!summary.unconverted.length && (
        <Banner icon="alert" title={`Chưa quy đổi VND: ${summary.unconverted.map((u) => `${u.amount} ${u.currency}`).join(", ")}`} />
      )}

      <div className="ap-split-wide">
        <Card receipt eyebrow="Theo thời gian" title="Doanh thu theo nguồn">
          {stacks.length ? (
            <>
              <div className="am-stack-chart" role="img" aria-label={`Biểu đồ cột chồng theo nguồn, ${stacks.length} kỳ, cao nhất ${formatVnd(maxTotal)}`}>
                {stacks.map((c) => (
                  <div key={c.period} className="am-stack-col" title={`${periodLabel(c.period)}: ${formatVnd(c.total)}`}>
                    <div className="am-stack-bar" style={{ height: `${Math.max(4, (c.total / maxTotal) * 100)}%` }}>
                      {c.parts.map((p) => <span key={p.source} style={{ flexGrow: p.amount, background: SOURCE_COLORS[p.source] ?? "var(--ap-blue)" }} />)}
                    </div>
                    <small>{periodLabel(c.period)}</small>
                  </div>
                ))}
              </div>
              <ul className="am-legend">
                {sources.map((s) => <li key={s}><i style={{ background: SOURCE_COLORS[s] ?? "var(--ap-blue)" }} />{REVENUE_SOURCE_LABELS[s] ?? s}</li>)}
              </ul>
            </>
          ) : <p className="ap-card-note">Chưa có khoản thu trong kỳ.</p>}
        </Card>
        <Card receipt eyebrow="Tổng hợp" title="Theo nguồn">
          <ul className="am-sources">
            {summary.bySource.map((s) => (
              <li key={s.source}>
                <div className="am-sources-head"><b>{REVENUE_SOURCE_LABELS[s.source] ?? s.name}</b><Chip tone={s.enabled ? "success" : "outline"}>{s.enabled ? "Đang nhận" : "Đã ngừng"}</Chip></div>
                <dl className="am-dl">
                  <div><dt>Đã xác nhận</dt><dd>{formatVnd(s.confirmed)}</dd></div>
                  <div><dt>Tạm tính</dt><dd>{formatVnd(s.estimated)}</dd></div>
                  <div><dt>Đã hoàn</dt><dd>{formatVnd(s.refunded)}</dd></div>
                  <div><dt>Số khoản thu</dt><dd>{s.charges}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card receipt eyebrow={`${list.entries.length} khoản trong bộ lọc`} title="Sổ doanh thu">
        <Table columns={columns} rows={list.entries} caption="Sổ doanh thu" selected={(e) => String(e.id) === query.id} empty="Chưa có khoản nào trong bộ lọc." />
        {list.entries.length === 50 && (
          <nav className="ap-pagination" aria-label="Phân trang">
            <span />
            <Button href={`/admin/revenue?${new URLSearchParams({ ...filters, beforeId: String(list.entries.at(-1)!.id) })}`} variant="coral">Trang tiếp</Button>
          </nav>
        )}
      </Card>

      {selected && (
        <Drawer title={`Truy vết khoản #${selected.id}`} closeHref={closeHref}>
          <Card receipt compact>
            <dl className="am-dl">
              <div><dt>Số tiền</dt><dd><b>{money(selected)}</b></dd></div>
              <div><dt>Trạng thái</dt><dd><Chip tone={STATUS_TONES[selected.status] ?? "outline"}>{REVENUE_STATUS_LABELS[selected.status] ?? selected.status}</Chip></dd></div>
              <div><dt>Người dùng</dt><dd>{selected.user_id ?? "Chưa gắn (đơn chỉ có trong báo cáo Google)"}</dd></div>
              <div><dt>Gói</dt><dd>{selected.sku ?? "—"}</dd></div>
              {selected.note && <div><dt>Lý do</dt><dd>{selected.note}</dd></div>}
            </dl>
            <span className="ap-eyebrow">Bằng chứng</span>
            <pre className="am-pre">{JSON.stringify(selected.evidence, null, 2)}</pre>
          </Card>
          {!!list.history.length && (
            <Card eyebrow="Lịch sử thay đổi" compact flat>
              <ol className="am-log">
                {list.history.map((h) => (
                  <li key={h.id}>
                    <b>Trước đó {REVENUE_STATUS_LABELS[h.previous.status] ?? h.previous.status} · {money(h.previous)}</b>
                    <small>{time(h.changed_at)}</small>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {query.error === "adjust" && <p className="am-error" role="alert">Không ghi nhận được. Kiểm tra quyền, MFA và số tiền.</p>}
          {query.saved && <p className="am-message" role="status">Đã ghi nhận điều chỉnh.</p>}
          {selected.kind === "charge" && selected.status === "confirmed" && selected.amount_vnd !== null && (
            <Card eyebrow="Hoàn tiền / điều chỉnh" compact flat note="Ghi một dòng âm mới; dòng gốc giữ nguyên. Cần quyền điều chỉnh doanh thu và xác thực MFA.">
              <form action={adjustRevenue} className="ap-form">
                <fieldset disabled={!mfaVerified}>
                  <input type="hidden" name="ledgerId" value={selected.id} />
                  <Field label="Loại">
                    <select name="kind" defaultValue="refund">
                      <option value="refund">Hoàn tiền</option>
                      <option value="adjustment">Điều chỉnh</option>
                    </select>
                  </Field>
                  <Field label="Số tiền (VND)"><input name="amountVnd" type="number" min={1} max={selected.amount_vnd} required /></Field>
                  <Field label="Mã giao dịch hoàn (nếu có)"><input name="externalRef" /></Field>
                  <Field label="Lý do"><input name="reason" minLength={5} maxLength={500} required /></Field>
                  <SubmitButton className="ap-btn is-coral">Ghi nhận</SubmitButton>
                </fieldset>
              </form>
            </Card>
          )}
        </Drawer>
      )}
    </>
  );
}
