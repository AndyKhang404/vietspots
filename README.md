# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

# VietSpots

VietSpots — Ứng dụng web khám phá địa điểm tại Việt Nam, xây dựng bằng Vite + React + TypeScript. Ứng dụng cung cấp tìm kiếm, bản đồ, đánh giá và tối ưu lộ trình.

## Tóm tắt dự án

- **Stack:** Vite, React, TypeScript, Tailwind CSS, shadcn-ui, Supabase, MapLibre
- **Scripts:** xem [package.json](package.json) (`dev`, `build`, `preview`, `lint`)

## Bắt đầu nhanh

### Yêu cầu

- Node.js 18+ (hoặc Bun), Git. Tuỳ chọn: `pnpm` hoặc `yarn`.

### Clone

```bash
git clone <YOUR_GIT_URL>
cd vietspots
```

### Cài dependencies

```bash
npm ci
# hoặc
pnpm install
# hoặc
bun install
```

### Chạy môi trường phát triển

```bash
npm run dev
# hoặc
pnpm dev
# hoặc
bun run dev
```

### Build & Preview

```bash
npm run build
npm run preview
```

### Lint

```bash
npm run lint
```

## Biến môi trường / Secrets

Ứng dụng sử dụng Supabase và các tích hợp khác. Tạo file `.env` hoặc `.env.local` với các biến cần thiết, ví dụ:

```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

Kiểm tra mã trong [src](src) / [integrations/supabase](src/integrations/supabase) để biết tên biến thực tế.

## Cấu trúc dự án (tóm tắt)

- `src/`: mã nguồn chính (components, pages, hooks, contexts)
- `src/pages/`: các route page (Index, PlaceDetail, Itinerary...)
- `src/components/`: UI và feature components
- `integrations/`: client cho bên thứ ba (Supabase)
- `supabase/`: functions và cấu hình liên quan

Xem chi tiết trong thư mục [src](src).

## Triển khai

Build bằng `npm run build` và triển khai nội dung `dist/` lên hosting tĩnh (Vercel, Netlify, Cloudflare Pages) hoặc server phù hợp. Nếu dùng Supabase Edge Functions, đảm bảo deploy functions tương ứng trong thư mục `supabase/`.

## Contributing

- Fork → Tạo branch feature → Tạo PR.
- Chạy `npm run lint` và đảm bảo không có lỗi type. Viết test khi cần.

## Troubleshooting

- Lỗi bản đồ: kiểm tra token/config MapLibre và CORS.
- Lỗi Supabase: kiểm tra `VITE_SUPABASE_*` trong `.env`.

## License & Contact

- Thêm file license (ví dụ MIT) nếu muốn cấp phép mã nguồn.
- Mở issue hoặc liên hệ maintainer trong repository để hỏi thêm.

---

File này được cập nhật tự động bởi trợ lý; bạn có thể chỉnh lại nội dung tuỳ ý.
