import Layout from "@/components/Layout";

export default function Contact() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-4">Thông tin liên hệ</h1>
          <p className="mb-4">VietSpots luôn sẵn sàng lắng nghe ý kiến đóng góp và giải đáp mọi thắc mắc của bạn.</p>

          <ul className="list-none pl-0 mt-2 text-sm text-muted-foreground space-y-3">
            <li><strong>Email hỗ trợ:</strong> <a href="mailto:iamhuy29062006@gmail.com" className="text-primary hover:underline">iamhuy29062006@gmail.com</a></li>
            <li><strong>Hotline:</strong> (+84) 123 456 789</li>
            <li><strong>Văn phòng:</strong> 227 Nguyễn Văn Cừ, Phường 4, Quận 5, Tp. Hồ Chí Minh.</li>
            <li><strong>Kênh mạng xã hội:</strong> GitHub: <a href="https://github.com/ThaiQuangHuy2906" className="text-primary hover:underline">ThaiQuangHuy2906</a></li>
            <li><strong>Thời gian hỗ trợ:</strong> Thứ 2 - Thứ 6: 08:30 - 18:00; Thứ 7: 09:00 - 12:00</li>
          </ul>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">Bạn có thể gửi yêu cầu hỗ trợ trực tiếp hoặc phản hồi sản phẩm qua email hoặc form liên hệ (placeholder):</p>
            <div className="mt-3">
              <input placeholder="Chủ đề" className="w-full p-3 rounded-md border border-border mb-2" />
              <textarea placeholder="Nội dung (hãy mô tả chi tiết)" className="w-full p-3 rounded-md border border-border h-28" />
              <div className="mt-3 flex justify-end">
                <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground">Gửi</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
