import { useEffect, useState, useCallback } from 'react';
import { getLenis, scrollTo } from '../lib/lenis';

interface SectionItem {
  id: string;
  label: string;
  num: string;
}

const SECTIONS: SectionItem[] = [
  { id: 'hero', label: 'Главная', num: '01' },
  { id: 'projects', label: 'Проекты', num: '02' },
  { id: 'about', label: 'О нас', num: '03' },
  { id: 'gallery', label: 'Галерея', num: '04' },
  { id: 'request', label: 'Заявка', num: '05' },
  { id: 'contacts', label: 'Контакты', num: '06' },
];

export function ScrollHUD() {
  const [progress, setProgress] = useState(0);
  const [activeSection, setActiveSection] = useState('hero');
  const [isVisible, setIsVisible] = useState(false);

  // Обновление состояния прокрутки через Lenis
  useEffect(() => {
    let ticking = false;

    const updateScroll = () => {
      const lenis = getLenis();
      let currentProgress = 0;
      let scrollY = 0;

      if (lenis) {
        currentProgress = lenis.progress || 0;
        scrollY = lenis.scroll || 0;
      } else {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        scrollY = window.scrollY || window.pageYOffset || 0;
        currentProgress = totalHeight > 0 ? scrollY / totalHeight : 0;
      }

      setProgress(Math.max(0, Math.min(1, currentProgress)));
      setIsVisible(scrollY > 60);

      // Определение текущей активной секции по вертикальному положению
      const scrollCenter = scrollY + window.innerHeight * 0.38;
      let currentActive = SECTIONS[0].id;

      for (const section of SECTIONS) {
        const el = document.getElementById(section.id);
        if (el) {
          const top = el.offsetTop;
          if (scrollCenter >= top) {
            currentActive = section.id;
          }
        }
      }

      setActiveSection(currentActive);
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    const lenis = getLenis();
    if (lenis) {
      lenis.on('scroll', handleScroll);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    updateScroll();

    return () => {
      if (lenis) {
        lenis.off('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleNavClick = useCallback((id: string) => {
    scrollTo(`#${id}`, -64);
  }, []);

  const percentInt = Math.round(progress * 100);

  return (
    <>
      {/* 1. Верхний индикатор прогресса (в стиле ArtCraft / modern agency) */}
      <div
        className="fixed top-0 left-0 right-0 h-[2.5px] z-[60] pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="h-full bg-black transition-transform duration-100 ease-out origin-left shadow-[0_0_8px_rgba(0,0,0,0.3)]"
          style={{
            transform: `scaleX(${progress})`,
          }}
        />
      </div>

      {/* 2. Боковой HUD-навигатор в стиле getartcraft.com/apps (на экранах от 1280px) */}
      <aside
        aria-label="Навигация по разделам"
        className={`hidden xl:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-row items-center gap-5 px-4 py-3.5 rounded-2xl bg-white/75 hover:bg-white/95 backdrop-blur-md border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.07)] hover:shadow-[0_12px_40px_rgb(0,0,0,0.14)] transition-all duration-400 select-none pointer-events-auto ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-40 hover:opacity-100 translate-x-1'
        }`}
      >
        {/* Список секций */}
        <nav className="flex flex-col items-end gap-3 text-right">
          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => handleNavClick(section.id)}
                className={`group flex items-center justify-end gap-2.5 transition-all duration-300 py-0.5 cursor-pointer focus:outline-none ${
                  isActive
                    ? 'text-black font-extrabold scale-100 translate-x-0'
                    : 'text-neutral-400 font-medium hover:text-neutral-800 translate-x-1 hover:translate-x-0'
                }`}
                aria-current={isActive ? 'true' : undefined}
              >
                {/* Текст и номер */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-mono tracking-widest uppercase transition-opacity ${
                      isActive ? 'opacity-40 text-black' : 'opacity-0 group-hover:opacity-60 text-neutral-400'
                    }`}
                  >
                    {section.num}
                  </span>
                  <span
                    className={`tracking-wider uppercase transition-all ${
                      isActive
                        ? 'text-xs md:text-sm tracking-widest font-black text-black'
                        : 'text-[11px] tracking-wide text-neutral-400 group-hover:text-neutral-700'
                    }`}
                  >
                    {section.label}
                  </span>
                </div>

                {/* Индикаторная чёрточка / точка */}
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-4 h-[2px] bg-black shadow-sm'
                      : 'w-1.5 h-[1.5px] bg-neutral-300 group-hover:w-2.5 group-hover:bg-neutral-500'
                  }`}
                />
              </button>
            );
          })}
        </nav>

        {/* Вертикальная шкала со счётчиком процентов (Precision Ruler) */}
        <div className="flex flex-col items-center h-48 relative pl-1">
          {/* Верхняя отметка 0% */}
          <span className="text-[8px] font-mono text-neutral-400 mb-1 leading-none select-none">
            00
          </span>

          {/* Линия шкалы */}
          <div className="relative flex-1 w-[1px] bg-neutral-200">
            {/* Промежуточные деления шкалы (25%, 50%, 75%) */}
            <div className="absolute top-[25%] -left-[2px] w-[5px] h-[1px] bg-neutral-300" />
            <div className="absolute top-[50%] -left-[3px] w-[7px] h-[1px] bg-neutral-400" />
            <div className="absolute top-[75%] -left-[2px] w-[5px] h-[1px] bg-neutral-300" />

            {/* Бегунок шкалы с текущим процентом */}
            <div
              className="absolute -left-[14px] -translate-y-1/2 flex items-center justify-center transition-transform duration-75 ease-out"
              style={{
                top: `${progress * 100}%`,
              }}
            >
              <div className="px-1.5 py-0.5 rounded bg-black text-white text-[8px] font-mono font-bold leading-none shadow-md">
                {percentInt.toString().padStart(2, '0')}%
              </div>
            </div>
          </div>

          {/* Нижняя отметка 100% */}
          <span className="text-[8px] font-mono text-neutral-400 mt-1 leading-none select-none">
            99
          </span>
        </div>
      </aside>
    </>
  );
}
