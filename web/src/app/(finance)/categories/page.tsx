import { SubmitButton } from "@/core/ui/submit-button";
import Image from "next/image";
import { requireApiSession } from "@/core/auth/require-api-session";

function getCategoryPaperArt(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("lương")) return "/paper/category-salary-v1.png";
  if (n.includes("thưởng")) return "/paper/category-bonus-v1.png";
  if (n.includes("đầu tư")) return "/paper/category-investment-v1.png";
  if (n.includes("quà")) return "/paper/category-gift-v1.png";
  if (n.includes("ăn") || n.includes("cafe") || n.includes("cà phê")) return "/paper/category-cafe-v1.png";
  if (n.includes("chợ") || n.includes("thực phẩm") || n.includes("sinh hoạt")) return "/paper/category-groceries-v1.png";
  if (n.includes("xe") || n.includes("đi lại") || n.includes("di chuyển")) return "/paper/category-vehicle-v1.png";
  if (n.includes("hóa đơn") || n.includes("điện") || n.includes("nước")) return "/paper/category-bills-v1.png";
  if (n.includes("mua sắm") || n.includes("shopping")) return "/paper/category-shopping-v1.png";
  if (n.includes("sức khỏe") || n.includes("thuốc") || n.includes("y tế")) return "/paper/category-health-v1.png";
  if (n.includes("học") || n.includes("giáo dục")) return "/paper/category-education-v1.png";
  if (n.includes("nhà")) return "/paper/category-home-v1.png";
  if (n.includes("làm đẹp")) return "/paper/category-beauty-v1.png";
  if (n.includes("thể thao") || n.includes("gym")) return "/paper/category-fitness-v1.png";
  if (n.includes("giải trí") || n.includes("game")) return "/paper/category-gaming-v1.png";
  if (n.includes("du lịch")) return "/paper/category-travel-v1.png";
  if (n.includes("tiết kiệm")) return "/paper/category-savings-v1.png";
  if (n.includes("thú cưng") || n.includes("pet")) return "/paper/category-pet-v1.png";
  return null;
}

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
                  <h2 className="category-title">
                    {getCategoryPaperArt(category.name) ? (
                      <Image
                        src={getCategoryPaperArt(category.name)!}
                        alt=""
                        width={32}
                        height={32}
                        className="category-card-art"
                      />
                    ) : (
                      <span
                        className="color-dot"
                        style={{ backgroundColor: category.color ?? "#96606D" }}
                      />
                    )}
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
