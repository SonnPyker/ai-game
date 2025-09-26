import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useRefreshHandler() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Chỉ chạy logic refresh khi thực sự refresh trang (performance.navigation.type === 1)
    const handlePageLoad = () => {
      // Kiểm tra xem có phải refresh thật không
      if (performance.navigation && performance.navigation.type === 1) {
        const lastPath = sessionStorage.getItem('lastPath');
        
        // Nếu không có lastPath hoặc đang ở trang chủ, không làm gì
        if (!lastPath || lastPath === '/') {
          return;
        }

        // Các trường hợp ngoại lệ - không redirect về trang chủ
        const exceptionPaths = ['/world-builder', '/create-character', '/game'];
        
        if (exceptionPaths.includes(lastPath)) {
          if (lastPath === '/world-builder') {
            // Ở mục tạo thế giới - xóa thông tin đã điền nhưng vẫn ở trang đó
            localStorage.removeItem('world_gen_result');
            localStorage.removeItem('currentWorldData');
            localStorage.removeItem('currentWorldDescription');
            localStorage.removeItem('completeWorldData');
            // Không redirect, vẫn ở trang world-builder
          } else if (lastPath === '/create-character') {
            // Ở mục tạo nhân vật - quay lại mục mô tả nhân vật
            navigate('/create-character');
          } else if (lastPath === '/game') {
            // Ở chat game - vẫn ở đó khi refresh
            // Không làm gì, vẫn ở trang game
          }
        } else {
          // Các trang khác - redirect về trang chủ
          navigate('/');
        }
      }
    };

    const handleBeforeUnload = () => {
      // Lưu trạng thái hiện tại vào sessionStorage
      sessionStorage.setItem('lastPath', location.pathname);
    };

    // Lắng nghe sự kiện beforeunload để lưu trạng thái
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Kiểm tra khi component mount (chỉ chạy khi refresh)
    handlePageLoad();

    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [location.pathname, navigate]);
}
