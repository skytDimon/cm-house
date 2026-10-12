import { useEffect } from 'react';

type LenisLike = {
  scroll: number;
  stop: () => void;
  start: () => void;
  scrollTo: (target: number, options?: { immediate?: boolean; force?: boolean }) => void;
};

let lenisInstance: LenisLike | null = null;

export function setLenisInstance(instance: LenisLike | null) {
  lenisInstance = instance;
}

export function getLenisInstance(): LenisLike | null {
  return lenisInstance;
}

let lockCount = 0;
let savedScrollY = 0;

/**
 * Блокировка прокрутки фона страницы при открытии модалок.
 * Сохраняет точную позицию скролла и предотвращает сброс наверх при закрытии.
 */
export function lockScroll() {
  if (lockCount === 0) {
    savedScrollY = Math.round(
      lenisInstance?.scroll ??
      window.scrollY ??
      window.pageYOffset ??
      document.documentElement.scrollTop ??
      0
    );

    // Останавливаем Lenis
    try {
      lenisInstance?.stop();
    } catch {
      // ignore
    }

    // Блокируем скролл документа без использования position: fixed,
    // чтобы не схлопывать высоту страницы и не сбрасывать scroll в 0
    document.documentElement.classList.add('lenis-stopped');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  lockCount++;
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const scrollY = savedScrollY;

    // Снимаем блокировку скролла
    document.documentElement.classList.remove('lenis-stopped');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';

    // Гарантируем восстановление сохранённой позиции
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' as ScrollBehavior });

    // Возобновляем Lenis и синхронизируем позицию
    try {
      lenisInstance?.start();
      lenisInstance?.scrollTo(scrollY, { immediate: true, force: true });
    } catch {
      // ignore
    }
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
