import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

interface SlideImage {
  src: string;
  title: string;
  subtitle: string;
}

const HACOM_IMAGES: SlideImage[] = [
  {
    src: '/hacom-riverside.jpg',
    title: 'Hacom Riverside',
    subtitle: 'Không gian sống hiện đại bên sông - Nơi hội tụ tinh hoa và đẳng cấp thượng lưu',
  },
  {
    src: '/hacom-imperial-dalat.jpg',
    title: 'Hacom Imperial Dalat',
    subtitle: 'Dự án nổi bật tại Đà Lạt - Kiến trúc tân cổ điển sang trọng giữa ngàn hoa',
  },
  {
    src: '/hacom-tower.jpg',
    title: 'Hacom Tower',
    subtitle: 'Biểu tượng mới của thành phố - Tòa cao ốc phức hợp hiện đại bậc nhất',
  },
  {
    src: '/hacom-wind.jpg',
    title: 'Hacom Wind',
    subtitle: 'Năng lượng xanh cho tương lai - Kiến tạo giá trị bền vững cho thế hệ mai sau',
  },
];

const EXIT_DURATION = 300;
const SLIDE_DURATION = 5000;

export function AuthLayout() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'enter' | 'exit'>('enter');

  const goToSlide = (next: number) => {
    setPhase('exit');
    window.setTimeout(() => {
      setIndex(next);
      setPhase('enter');
    }, EXIT_DURATION);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      goToSlide((index + 1) % HACOM_IMAGES.length);
    }, SLIDE_DURATION);
    return () => window.clearInterval(id);
  }, [index]);

  const current = HACOM_IMAGES[index];

  return (
    <div className="auth-shell-root">
      <div className="auth-shell-image">
        {HACOM_IMAGES.map((img, i) => (
          <div
            key={img.src}
            className={`auth-shell-image-layer${i === index ? ' is-active' : ''}`}
            style={{ backgroundImage: `url(${img.src})` }}
          />
        ))}
        <div className="auth-shell-image-scrim" />

        <div className="auth-shell-image-content">
          <h2
            key={`title-${current.title}`}
            className={`auth-shell-image-title${phase === 'exit' ? ' is-exiting' : ''}`}
          >
            {current.title}
          </h2>
          <p
            key={`subtitle-${current.title}`}
            className={`auth-shell-image-subtitle${phase === 'exit' ? ' is-exiting' : ''}`}
          >
            {current.subtitle}
          </p>

          <div className="auth-shell-dots" aria-label="Chọn dự án nổi bật">
            {HACOM_IMAGES.map((img, i) => (
              <button
                key={img.src}
                type="button"
                aria-label={`Xem ${img.title}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => goToSlide(i)}
                className={`auth-shell-dot${i === index ? ' is-active' : ''}`}
              >
                <span className="auth-shell-dot-label">
                  {img.title.replace('Hacom ', '')}
                </span>
                <span className="auth-shell-dot-track">
                  {i === index && phase === 'enter' ? (
                    <span key={index} className="auth-shell-dot-fill" />
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-shell-form-side">
        <div className="auth-shell-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
