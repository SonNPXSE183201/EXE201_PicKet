import { SubmitButton } from "@/core/ui/submit-button";
import { requireApiSession } from "@/core/auth/require-api-session";

import { archiveCategory, createCategory, updateCategory } from "../actions";
import { FinancePageHeader, MutationError } from "../finance-ui";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function CategoriesPage({ searchParams }: PageProps) {
  const { accessToken, api } = await requireApiSession();
  const { categories } = await api.listCategories(accessToken);
  const { error } = await searchParams;
  return (
    <>
      <FinancePageHeader
        title="Danh mục"
        description="Danh mục thu/chi được dùng chung khi tạo giao dịch và ngân sách."
      />
      <MutationError visible={Boolean(error)} />
      <section className="finance-columns">
        <article className="finance-panel">
          <h2>Danh mục mới</h2>
          <form action={createCategory} className="finance-form">
            <label>
              Tên danh mục
              <input maxLength={80} name="name" required />
            </label>
            <label>
              Áp dụng cho
              <select defaultValue="expense" name="kind">
                <option value="expense">Khoản chi</option>
                <option value="income">Khoản thu</option>
                <option value="both">Cả hai</option>
              </select>
            </label>
            <label>
              Màu
              <input
                defaultValue="#96606D"
                maxLength={16}
                name="color"
                type="color"
              />
            </label>
            <SubmitButton className="button primary">Tạo danh mục</SubmitButton>
          </form>
        </article>
        <section className="finance-stack">
          {categories.map((category) => (
            <article className="resource-card" key={category.id}>
              <div className="resource-summary">
                <div>
                  <h2>
                    <span
                      className="color-dot"
                      style={{ backgroundColor: category.color ?? "#96606D" }}
                    />
                    {category.name}
                  </h2>
                  <p>
                    {category.kind} ·{" "}
                    {category.custom ? "Tùy chỉnh" : "Mặc định"} · phiên bản{" "}
                    {category.version}
                  </p>
                </div>
              </div>
              {category.custom && (
                <>
                  <details>
                    <summary>Chỉnh sửa</summary>
                    <form action={updateCategory} className="inline-form">
                      <input name="id" type="hidden" value={category.id} />
                      <input
                        name="version"
                        type="hidden"
                        value={category.version}
                      />
                      <label>
                        Tên
                        <input
                          defaultValue={category.name}
                          maxLength={80}
                          name="name"
                          required
                        />
                      </label>
                      <label>
                        Loại
                        <select defaultValue={category.kind} name="kind">
                          <option value="expense">Khoản chi</option>
                          <option value="income">Khoản thu</option>
                          <option value="both">Cả hai</option>
                        </select>
                      </label>
                      <label>
                        Màu
                        <input
                          defaultValue={category.color ?? "#96606D"}
                          name="color"
                          type="color"
                        />
                      </label>
                      <SubmitButton className="small-button">
                        Lưu thay đổi
                      </SubmitButton>
                    </form>
                  </details>
                  <form action={archiveCategory}>
                    <input name="id" type="hidden" value={category.id} />
                    <input
                      name="version"
                      type="hidden"
                      value={category.version}
                    />
                    <SubmitButton className="danger-link">
                      Lưu trữ danh mục
                    </SubmitButton>
                  </form>
                </>
              )}
            </article>
          ))}
        </section>
      </section>
    </>
  );
}
