import Layout from "@/components/Layout";
import { useTranslation } from "react-i18next";
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  return (
    <Layout>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-8">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">CHÍNH SÁCH BẢO MẬT VIETSPOTS</h1>
          <p className="text-sm text-muted-foreground mb-6">Cập nhật lần cuối: 28/12/2025</p>

          <p className="mb-4">Chào mừng bạn đến với VietSpots. Chúng tôi cam kết bảo vệ quyền riêng tư và thông tin cá nhân của người dùng. Chính sách này mô tả cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.</p>

        <h2 className="font-semibold mt-4">1. Thông tin chúng tôi thu thập</h2>
        <ul className="list-disc pl-6 mt-2 mb-4 text-sm text-muted-foreground">
          <li><strong>Thông tin cá nhân:</strong> Khi bạn đăng ký tài khoản, chúng tôi có thể thu thập tên, email và ảnh đại diện.</li>
          <li><strong>Dữ liệu vị trí:</strong> Với sự cho phép của bạn, chúng tôi sử dụng GPS hoặc địa chỉ IP để giúp bạn tìm kiếm các địa điểm gần nhất.</li>
          <li><strong>Nội dung người dùng:</strong> Các đánh giá, hình ảnh và địa điểm bạn đóng góp cho cộng đồng.</li>
        </ul>

        <h2 className="font-semibold mt-4">2. Cách chúng tôi sử dụng thông tin</h2>
        <ul className="list-disc pl-6 mt-2 mb-4 text-sm text-muted-foreground">
          <li>Cung cấp và duy trì các tính năng của VietSpots.</li>
          <li>Cá nhân hóa trải nghiệm người dùng dựa trên sở thích và vị trí.</li>
          <li>Gửi thông báo về các cập nhật, tính năng mới hoặc phản hồi các thắc mắc của bạn.</li>
          <li>Phân tích hiệu suất để cải thiện giao diện và tính năng ứng dụng.</li>
        </ul>

        <h2 className="font-semibold mt-4">3. Chia sẻ thông tin</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">VietSpots không bán hoặc cho thuê thông tin cá nhân của bạn cho bên thứ ba. Chúng tôi chỉ chia sẻ thông tin khi:</p>
        <ul className="list-disc pl-6 mt-2 mb-4 text-sm text-muted-foreground">
          <li>Được sự đồng ý của bạn.</li>
          <li>Sử dụng các dịch vụ bản đồ bên thứ ba (như Google Maps API/Mapbox) để hiển thị dữ liệu địa lý.</li>
          <li>Tuân thủ các yêu cầu pháp lý từ cơ quan chức năng.</li>
        </ul>

        <h2 className="font-semibold mt-4">4. Bảo mật dữ liệu</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">Chúng tôi áp dụng các biện pháp bảo mật tiêu chuẩn để ngăn chặn việc truy cập, thay đổi hoặc phá hủy dữ liệu trái phép. Tuy nhiên, không có phương thức truyền tải qua Internet nào là an toàn 100%.</p>

        <h2 className="font-semibold mt-4">5. Quyền của người dùng</h2>
        <p className="text-sm text-muted-foreground mt-2 mb-4">Bạn có quyền truy cập, chỉnh sửa hoặc yêu cầu xóa dữ liệu cá nhân của mình bất kỳ lúc nào thông qua cài đặt tài khoản hoặc liên hệ trực tiếp với chúng tôi.</p>

          <p className="text-sm text-muted-foreground mt-6">Thông tin liên hệ được giữ tách biệt để bảo mật và thuận tiện tra cứu — xem trang <Link to="/contact" className="text-primary hover:underline">Liên hệ</Link> để biết chi tiết hỗ trợ và kênh liên hệ.</p>
        </div>

      </div>
    </Layout>
  );
}
