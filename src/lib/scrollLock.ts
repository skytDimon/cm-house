import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

/**
 * Блокировка прокрутки фона страницы.
 * Поддерживает множественные вложенные модалки (счётчик lockCount)
 * и предотвращает сброс позиции на iOS и других браузерах.
 */
export function lockScroll() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollY = savedScrollY;

    // Временно отключаем плавный скролл, чтобы восстановление было мгновенным
    document.documentElement.style.scrollBehavior = 'auto';

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
  }
  lockCount++;
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const scrollY = savedScrollY;

    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.body.style.overscrollBehavior = '';

    // Мгновенно возвращаем скролл на сохранённую позицию без прыжков
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior });

    // Возвращаем плавный скролл на следующем кадре
    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = '';
    });
  }
}

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    lockScroll();
    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}
