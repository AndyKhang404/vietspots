import Layout from "@/components/Layout";

export default function Contact() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-4">Thông tin liên hệ</h1>
        <p className="mb-4">VietSpots luôn sẵn sàng lắng nghe ý kiến đóng góp và giải đáp mọi thắc mắc của bạn.</p>

        <ul className="list-none pl-0 mt-2 text-sm text-muted-foreground space-y-2">
          <li><strong>Email hỗ trợ:</strong> <a href="mailto:huy.thaiquang2906@gmail.com" className="text-primary hover:underline">huy.thaiquang2906@gmail.com</a></li>
          <li><strong>Hotline:</strong> (+84) XXX XXX XXX</li>
          <li><strong>Văn phòng:</strong> Quận Ngũ Hành Sơn, Thành phố Đà Nẵng, Việt Nam.</li>
          <li><strong>Kênh mạng xã hội:</strong> GitHub: <a href="https://github.com/ThaiQuangHuy2906" className="text-primary hover:underline">ThaiQuangHuy2906</a>; Facebook: VietSpots Community; Instagram: @vietspots_vn</li>
          <li><strong>Thời gian hỗ trợ:</strong> Thứ 2 - Thứ 6: 08:30 - 18:00; Thứ 7: 09:00 - 12:00</li>
        </ul>
      </div>
    </Layout>
  );
}
