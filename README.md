# VietSpots (VietSpots Team)

VietSpots là một ứng dụng web khám phá địa điểm tại Việt Nam, giúp người dùng tìm, đánh giá, lưu lại và tối ưu lộ trình tham quan. Project này được phát triển bằng Vite + React + TypeScript, sử dụng Supabase làm backend/BaaS và MapLibre cho bản đồ.

Tài liệu này trình bày cách chạy, cấu hình và đóng góp cho dự án.

---

## Tổng quan

- Tên dự án: **VietSpots**
- Chủ sở hữu: **VietSpots Team**
- Ngôn ngữ: Tiếng Việt (một số file hỗ trợ i18n)

## Tính năng chính

- Tìm kiếm địa điểm theo tên, loại và vị trí
- Xem thông tin chi tiết địa điểm, ảnh và bản đồ
- Đánh giá & chấm sao (cùng upload ảnh minh hoạ)
- Tối ưu lộ trình (itinerary/route optimizer)
- Quản lý yêu thích cá nhân
- Xác thực người dùng qua Supabase Auth

## Kiến trúc & Công nghệ

- Frontend: Vite, React, TypeScript
- UI: Tailwind CSS, shadcn-ui components
- Bản đồ: MapLibre
- Backend / BaaS: Supabase (Auth, Database, Storage, Edge Functions)
- Tooling: ESLint, Prettier, Vitest (nếu có)

---

## Bắt đầu nhanh (Developer)

Yêu cầu:
- Node.js 18+ (hoặc Bun)
- Git

Clone repository và cài dependencies:

```bash
git clone <YOUR_GIT_URL>
cd vietspots
# Nếu bạn dùng npm
npm ci
# hoặc pnpm
pnpm install
# hoặc bun
bun install
```

Chạy môi trường phát triển:

```bash
npm run dev
# hoặc pnpm dev
```

Build production:

```bash
npm run build
npm run preview
```

Kiểm tra lint:

```bash
npm run lint
```

---

## Biến môi trường (ví dụ)

Tạo file `.env.local` hoặc `.env` ở gốc dự án và thêm các biến sau:

```
VITE_SUPABASE_URL=https://your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_IMAGES_BUCKET=images
VITE_TRACKASIA_PUBLIC_KEY=your-track-asia-key
```

Ghi chú:
- `VITE_SUPABASE_IMAGES_BUCKET` là tên bucket dùng để lưu ảnh người dùng. Nếu không set, app sẽ fallback sang `images`.

---

## Cấu trúc dự án (quan trọng)

- `src/` — mã nguồn chính
	- `src/pages/` — các trang chính (Index, PlaceDetail, Itinerary...)
	- `src/components/` — thành phần UI dùng lại
	- `src/hooks/` — custom hooks (ví dụ `useReviews`)
	- `src/contexts/` — React Contexts (Auth, Favorites...)
- `supabase/` — functions & migrations
- `public/` — tài nguyên tĩnh

---

## Supabase (thiết lập cơ bản)

1. Tạo project Supabase và thiết lập Database theo schema của dự án.
2. Tạo bucket lưu ảnh (tên khớp `VITE_SUPABASE_IMAGES_BUCKET`).
3. Cấu hình RLS / Policies nếu cần (read public images hoặc sử dụng Signed URLs).

## Upload ảnh và Timezone

- Ứng dụng hiện lưu `created_at` trên bản ghi comment và hiển thị giờ theo timezone local trên trình duyệt. Nếu bạn muốn hiển thị theo UTC hoặc timezone server, có thể điều chỉnh tại component hiển thị.

---

## Triển khai

- Đối với hosting tĩnh (Vercel / Netlify / Cloudflare Pages): build `npm run build` và deploy thư mục `dist/`.
- Nếu dùng Supabase Edge Functions, deploy folder `supabase/functions` theo hướng dẫn Supabase.

## Kiểm tra sau deploy

- Kiểm tra biến môi trường (Supabase URL / Keys).
- Kiểm tra bucket ảnh và quyền truy cập.

---

## Contributing

1. Fork repository
2. Tạo branch feature: `git checkout -b feature/your-feature`
3. Code & viết test (nếu cần)
4. Lint và build local: `npm run lint` + `npm run build`
5. Tạo PR và mô tả rõ thay đổi

Standards:
- Dùng Prettier + ESLint quy ước dự án
- Viết commit rõ ràng

---

## Support / Contact

- Mở issue trên repository để báo lỗi hoặc yêu cầu tính năng.
- Liên hệ VietSpots Team qua kênh nội bộ của nhóm.

---

## License

Thêm file `LICENSE` (ví dụ MIT) nếu bạn muốn công khai mã nguồn.

---

Tài liệu này do VietSpots Team duy trì. Nếu bạn muốn phiên bản tiếng Anh hoặc thêm badges (CI, license, coverage), cho mình biết để mình bổ sung.
