import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { setLenisInstance } from './scrollLock';

let lenis: Lenis | null = null;


/**
 * Инициализация Lenis Smooth Scroll с физикой, повторяющей getartcraft.com/apps:
 * - инерция и плавное замедление колеса мыши и тачпада
 * - гладкий переход по якорям без рывков
 * - корректная интеграция с модалками
 */
export function initLenis(): Lenis {
  if (lenis) return lenis;

  lenis = new Lenis({
    duration: 1.25,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.4,
    infinite: false,
    autoRaf: true,
    anchors: {
      offset: -64,
      duration: 1.2,
    },
    autoResize: true,
    prevent: (node) => {
      // Предотвращаем перехват скролла внутри элементов с явным data-lenis-prevent
      return node.hasAttribute('data-lenis-prevent') || Boolean(node.closest('[data-lenis-prevent]'));
    },
  });

  // Передаём инстанс в scrollLock для заморозки при открытии модалок
  setLenisInstance(lenis);

  // Глобальный перехват кликов по якорным ссылкам для гарантированной плавной прокрутки Lenis
  const handleAnchorClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement)?.closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (href && href.startsWith('#') && href.length > 1) {
      const element = document.querySelector(href);
      if (element) {
        e.preventDefault();
        lenis?.scrollTo(href, {
          offset: -64,
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        });
      }
    }
  };

  document.addEventListener('click', handleAnchorClick);

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function scrollTo(target: string | number | HTMLElement, offset = -64) {
  if (!lenis) {
    if (typeof target === 'string') {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
    return;
  }
  lenis.scrollTo(target, {
    offset,
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
}

export function destroyLenis() {
  if (lenis) {
    lenis.destroy();
    setLenisInstance(null);
    lenis = null;
  }
}
