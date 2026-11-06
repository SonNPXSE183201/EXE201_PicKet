import Link from "next/link";
import { randomUUID } from "node:crypto";
import { SubmitButton } from "@/core/ui/submit-button";
import { mutateAdmin } from "../actions";
import { AdminIcon } from "../ui/admin-icon";
import { AdminRecordForm } from "../components/admin-record-form";
import { Button, Card, Chip, Field, Table, formatDate, formatNumber, relativeTime, type Column } from "../ui/paper";
import { label, num, rows, sectionHref, statusTone, str, type Row, type ViewProps } from "./shared";
import { AsOf, Pager } from "./operations";
import "./ops-content-system.css";

const LESSON_ART = ["receipt-v2", "plan-envelope-v2", "save-jar-v1", "receipt-saved-scene-v1"];
const LESSON_TONES = ["mint", "blue", "lilac", "coral"];
const PARTNER_ART = ["category-food-v2", "category-cafe-v2", "category-transport-v2", "category-gift-v2"];

/* Figma › Admin Web › 17 · Nội dung (153:7414). */
export function ContentView(p: ViewProps) {
  const { data, query, page, mfaVerified, days } = p;
  const base = "/admin/content";
  const items = rows(data.rows);
  const creating = query.contentId === "new";
  const selected = creating ? undefined : items.find((r) => str(r.id) === query.contentId) ?? items[0];
  const total = num(data.total) ?? items.length;
  const hrefFor = (id: string) => `${sectionHref(base, query, { contentId: id })}#content-editor`;

  const lessonColumns: Column<Row>[] = [
    { key: "lesson_id", label: "Mã bài học", render: (r) => str(r.lesson_id) || "—" },
    { key: "content_version", label: "Phiên bản", align: "right", render: (r) => formatNumber(r.content_version) },
    { key: "published", label: "Cho phép chấm bài cloud", render: (r) => <Chip tone={r.published === true ? "success" : "outline"}>{r.published === true ? "Cho phép" : "Chưa cho phép"}</Chip> },
  ];

  return (
    <>
      <form className="ap-filter" method="get" aria-label="Lọc nội dung">
        <input type="hidden" name="days" value={days} />
        <Field label="Tìm kiếm" grow><input name="search" type="search" maxLength={160} defaultValue={query.search} placeholder="Tiêu đề hoặc thao tác" /></Field>
        <Field label="Trạng thái" width={160}>
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">Tất cả</option>
            {["draft", "review", "published", "archived"].map((s) => <option key={s} value={s}>{label(s)}</option>)}
          </select>
        </Field>
        <div className="ao-filter-actions">
          <button className="ap-btn" type="submit">Áp dụng</button>
          <Link className="ap-btn is-ghost" href={`${base}?days=${days}`}>Xoá bộ lọc</Link>
        </div>
      </form>

      <div className="ao-split">
        <div className="ap-stack">
          <div className="ao-section-head">
            <div>
              <span className="ap-eyebrow">Bài học cloud đã đăng ký</span>
              <h2 className="ap-card-title">{formatNumber(total)} bài · hiển thị ở mục Học về tiền</h2>
            </div>
            <Button href={`${sectionHref(base, query, { contentId: "new" })}#content-editor`} icon="plus">Bài mới</Button>
          </div>

          {items.length ? (
            <ul className="ao-lessons" aria-label="Danh sách bài học">
              {items.map((r, i) => {
                const on = str(r.id) === str(selected?.id);
                return (
                  <li key={str(r.id) || i}>
                    <Link className={`ao-lesson${on ? " is-selected" : ""}`} href={hrefFor(str(r.id))} aria-current={on ? "true" : undefined}>
                      <span className={`ao-lesson-top ap-tone-${LESSON_TONES[i % 4]}`}>
                        <span className="ap-eyebrow">Bài {page * 25 + i + 1}</span>
                        <img src={`/admin-paper/${LESSON_ART[i % 4]}.webp`} alt="" width={84} height={84} />
                      </span>
                      <span className="ao-lesson-body">
                        <b>{str(r.title)}</b>
                        <span className="ap-row"><Chip tone={statusTone(r.status)}>{label(r.status)}</Chip><small>Cập nhật {relativeTime(r.updated_at)}</small></span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : <p className="ap-card-note">Chưa có nội dung phù hợp trong kỳ này.</p>}

          <Card receipt eyebrow="Cloud" title="Phiên bản bài học đã đăng ký" note="Chỉ bài học đã công bố và được duyệt mới cho phép chấm bài cloud.">
            <Table columns={lessonColumns} rows={rows(data.lessons)} caption="Bài học cloud" rowKey={(r, i) => `${str(r.lesson_id)}-${i}`} />
          </Card>
          <Pager base={base} query={query} page={page} total={data.total} />
        </div>

        <aside id="content-editor" className="ap-stack ao-editor" aria-label="Biên tập nội dung">
          <Card eyebrow="Biên tập nội dung" title={creating ? "Bài mới" : selected ? str(selected.title) : "Chưa chọn bài"}>
            {(selected || creating) ? (
              <AdminRecordForm key={creating ? "new" : str(selected?.id)} action="content" row={creating ? undefined : selected} disabled={!mfaVerified} />
            ) : <p className="ap-card-note">Chưa có nội dung. Dùng “Bài mới” để tạo.</p>}
          </Card>
          {selected && (
            <Card eyebrow="Review độc lập" compact flat>
              <form className="ap-form" action={mutateAdmin}>
                <input type="hidden" name="action" value="review_content" />
                <input type="hidden" name="id" value={str(selected.id)} />
                <input type="hidden" name="expectedVersion" value={Number(selected.row_version)} />
                <input type="hidden" name="requestId" value={randomUUID()} />
                <fieldset disabled={!mfaVerified}>
                  <p className="ao-warn"><AdminIcon name="users" size={18} />Người review phải khác người chỉnh sửa nội dung gần nhất. Nội dung thay đổi sau review phải được kiểm tra lại.</p>
                  <Field label="Nhận xét review"><input name="reason" minLength={5} maxLength={500} required /></Field>
                  <Field label="Nhập SAVE để xác nhận"><input name="confirmation" pattern="SAVE" required autoComplete="off" /></Field>
                  <SubmitButton className="ap-btn is-secondary is-block">Xác nhận đã review</SubmitButton>
                </fieldset>
              </form>
            </Card>
          )}
        </aside>
      </div>
      <AsOf data={data} />
    </>
  );
}

const host = (url: unknown) => { try { return new URL(str(url)).host.replace(/^www\./, "") + (new URL(str(url)).pathname.replace(/\/$/, "")); } catch { return str(url) || "—"; } };
const shortDate = (v: unknown) => (str(v) ? formatDate(v).slice(0, 5) : "");

/* Figma › Admin Web › 18 · Đối tác (153:7637). */
export function PartnersView(p: ViewProps) {
  const { data, query, page, mfaVerified } = p;
  const base = "/admin/partners";
  const items = rows(data.rows);
  const creating = query.partnerId === "new";
  const selected = creating ? undefined : items.find((r) => str(r.id) === query.partnerId);
  const editing = creating || selected;
  const asOf = Date.parse(str(data.asOf)) || 0;

  return (
    <>
      <div className="ao-section-head">
        <div>
          <span className="ap-eyebrow">Ưu đãi hiển thị trong app</span>
          <h2 className="ap-card-title">Đối tác &amp; ưu đãi</h2>
        </div>
        <Button href={`${sectionHref(base, query, { partnerId: "new" })}#partner-editor`} icon="plus">Thêm đối tác</Button>
      </div>

      {items.length ? (
        <ul className="ao-partners" aria-label="Danh sách đối tác">
          {items.map((r, i) => {
            const active = r.active === true;
            const ended = str(r.ends_at) && Date.parse(str(r.ends_at)) < asOf;
            const name = str(r.partner) || host(r.url).split("/")[0] || str(r.title);
            const range = str(r.starts_at) || str(r.ends_at) ? (ended ? `Đã kết thúc ${shortDate(r.ends_at)}` : `${shortDate(r.starts_at) || "—"} – ${shortDate(r.ends_at) || "—"}`) : "Không giới hạn thời gian";
            return (
              <li key={str(r.id) || i} className={`ao-partner${active ? "" : " is-off"}${str(r.id) === str(selected?.id) ? " is-selected" : ""}`}>
                <span className={`ao-partner-logo ap-tone-${["coral", "mint", "blue", "lilac"][i % 4]}`}>
                  <img src={`/admin-paper/${PARTNER_ART[i % 4]}.webp`} alt="" width={56} height={56} />
                  <b>{name}</b>
                </span>
                <div className="ao-partner-body">
                  <div className="ao-partner-top">
                    <span className="ap-eyebrow" style={{ color: active ? "var(--ap-success)" : undefined }}>{active ? "Đang hiển thị" : "Đã ẩn"}</span>
                    <span className={`ao-switch${active ? " is-on" : ""}`} role="img" aria-label={active ? "Đang bật hiển thị" : "Đang tắt hiển thị"} />
                  </div>
                  <h3>{str(r.title)}</h3>
                  <a className="ao-partner-url" href={str(r.url)} target="_blank" rel="noopener noreferrer"><AdminIcon name="arrow-up-right" size={14} />{host(r.url)}</a>
                  <span className="ao-partner-date"><AdminIcon name="calendar" size={14} />{range}</span>
                  <Link className="ap-link" href={`${sectionHref(base, query, { partnerId: str(r.id) })}#partner-editor`} aria-current={str(r.id) === str(selected?.id) ? "true" : undefined} aria-label={`Chỉnh sửa ${str(r.title)}`}>Chỉnh sửa</Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="ap-card-note">Chưa có đối tác trong kỳ này.</p>}

      {editing && (
        <div id="partner-editor"><Card eyebrow={creating ? "Tạo mới" : "Biên tập đối tác"} title={creating ? "Thêm đối tác" : str(selected?.title)} className="ao-partner-editor"
          actions={<Link className="ap-link" href={sectionHref(base, query, { partnerId: undefined })}>Đóng</Link>}>
          <AdminRecordForm key={creating ? "new" : str(selected?.id)} action="partner" row={creating ? undefined : selected} disabled={!mfaVerified} />
        </Card></div>
      )}
      <Pager base={base} query={query} page={page} total={data.total} />
      <AsOf data={data} />
    </>
  );
}
