import { useState, useRef, useCallback, useEffect } from 'react';
import type { Project } from '../data/catalogData';

/* -------------------------------------------------------------------------- */
/*  useScrollLock — блокировка прокрутки фона (работает на iOS Safari)         */
/* -------------------------------------------------------------------------- */

function useScrollLock(isLocked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!isLocked) return;

    // Запомним текущую позицию прокрутки
    scrollYRef.current = window.scrollY;
    const scrollY = scrollYRef.current;

    // Фиксируем body, чтобы предотвратить скролл на iOS
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    // Предотвращаем «резинку» (bounce) на iOS
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      // Восстанавливаем позицию прокрутки
      window.scrollTo(0, scrollY);
    };
  }, [isLocked]);
}

/* -------------------------------------------------------------------------- */
/*  Catalog Modal — сетка проектов (дома / бани)                               */
/* -------------------------------------------------------------------------- */

type CatalogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  projects: Project[];
  onSelectProject: (project: Project) => void;
};

export function CatalogModal({ isOpen, onClose, title, projects, onSelectProject }: CatalogModalProps) {
  useScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white/10 backdrop-blur-xl border border-white/20 w-full max-w-5xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/20 flex justify-between items-center bg-black/40">
          <h2 className="text-3xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(proj => (
              <div
                key={proj.id}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
                onClick={() => onSelectProject(proj)}
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img src={proj.images[0]} alt={proj.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-sm font-medium">
                    {proj.area}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-white mb-2">{proj.title}</h3>
                  <p className="text-white/70 text-sm line-clamp-2">{proj.description}</p>
                  <div className="mt-4 text-lg font-semibold text-white">{proj.price}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Project Details Modal — детали конкретного проекта                         */
/* -------------------------------------------------------------------------- */

type ProjectDetailsModalProps = {
  project: Project | null;
  onClose: () => void;
  onOrder: (projectName: string) => void;
};

export function ProjectDetailsModal({ project, onClose, onOrder }: ProjectDetailsModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useScrollLock(project !== null);

  useEffect(() => { setCurrentSlide(0); }, [project?.id]);

  const scrollToSlide = useCallback((idx: number) => {
    if (!scrollRef.current) return;
    const child = scrollRef.current.children[idx] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    setCurrentSlide(idx);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    setCurrentSlide(Math.round(scrollLeft / clientWidth));
  }, []);

  if (!project) return null;
  const total = project.images.length;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 md:p-6 bg-black/80 backdrop-blur-md" onClick={onClose}>
        <div
        className="bg-[#111] border border-white/10 w-full h-full md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-3xl overflow-hidden flex flex-col md:flex-row relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors backdrop-blur-md border border-white/20">
          ✕
        </button>

        {/* Слайдер с фото */}
        <div className="w-full md:w-3/5 h-[40vh] md:h-[80vh] bg-black relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory w-full h-full"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {project.images.map((img, i) => (
              <div key={i} className="w-full h-full shrink-0 snap-center">
                <img 
                  src={img} 
                  alt={`${project.title} - ${i + 1}`} 
                  className="w-full h-full object-cover cursor-pointer" 
                  onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
                />
              </div>
            ))}
          </div>

          {/* Стрелки */}
          {total > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); scrollToSlide(Math.max(0, currentSlide - 1)); }}
                className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-all z-20 ${currentSlide === 0 ? 'opacity-30 pointer-events-none' : ''}`}
              >
                ‹
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); scrollToSlide(Math.min(total - 1, currentSlide + 1)); }}
                className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-black/70 transition-all z-20 ${currentSlide === total - 1 ? 'opacity-30 pointer-events-none' : ''}`}
              >
                ›
              </button>
            </>
          )}

          {/* Точки-индикаторы */}
          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
              {project.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); scrollToSlide(i); }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Инфо (справа на ПК, снизу на моб) */}
        <div className="w-full md:w-2/5 p-6 md:p-10 flex flex-col overflow-y-auto bg-gradient-to-b from-[#1a1a1a] to-[#0a0a0a]">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-white/10 border border-white/20 text-white px-3 py-1 rounded-full text-sm">{project.area}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">{project.title}</h2>

          <div className="text-2xl md:text-3xl font-semibold text-white mb-6">
            {project.price}
          </div>

          <div className="text-white/70 text-base md:text-lg leading-relaxed mb-8 whitespace-pre-line">
            {project.description}
          </div>

          <div className="mt-auto pt-8 flex flex-col gap-4">
            <button
              onClick={() => { onClose(); onOrder(project.title); }}
              className="w-full bg-white text-black font-bold text-lg py-4 rounded-xl hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
            >
              Заказать проект
            </button>
            <a
              href="tel:+79630492919"
              className="w-full bg-transparent border border-white/30 text-white font-semibold text-lg py-4 rounded-xl hover:bg-white/10 transition-colors text-center"
            >
              Задать вопрос (8 963 049 29 19)
            </a>
          </div>
        </div>
      </div>
    </div>

    <PhotoGalleryModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        images={project.images}
        title={project.title}
        initialIndex={currentSlide}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Photo Gallery Modal — красивая full-screen карусель для остальных категорий */
/* -------------------------------------------------------------------------- */

type PhotoGalleryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  title: string;
  initialIndex?: number;
};

export function PhotoGalleryModal({ isOpen, onClose, images, title, initialIndex = 0 }: PhotoGalleryModalProps) {
  useScrollLock(isOpen);

  const [current, setCurrent] = useState(initialIndex);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  useEffect(() => { if (isOpen) setCurrent(initialIndex); }, [isOpen, initialIndex]);

  const total = images.length;
  const goPrev = useCallback(() => setCurrent(i => Math.max(0, i - 1)), []);
  const goNext = useCallback(() => setCurrent(i => Math.min(total - 1, i + 1)), [total]);

  /* Свайп на телефоне */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);
  const onTouchEnd = useCallback(() => {
    if (Math.abs(touchDeltaX.current) > 50) {
      touchDeltaX.current < 0 ? goNext() : goPrev();
    }
  }, [goNext, goPrev]);

  /* Клавиши */
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, goPrev, goNext, onClose]);

  if (!isOpen || !total) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col" onClick={onClose}>
      {/* Верхняя панель */}
      <div className="flex items-center justify-between px-5 py-4 relative z-50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-white">{title}</h2>
          <span className="text-white/40 text-sm font-medium">{current + 1} / {total}</span>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Область с фото */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden px-4 md:px-16"
        onClick={e => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Стрелка влево (только ПК) */}
        {total > 1 && (
          <button
            onClick={goPrev}
            className={`hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white text-2xl transition-all z-30 ${current === 0 ? 'opacity-20 pointer-events-none' : ''}`}
          >
            ‹
          </button>
        )}

        {/* Трек фотографий */}
        <div className="w-full h-full flex items-center justify-center relative">
          {images.map((img, i) => (
            <div
              key={i}
              className="absolute inset-0 flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              style={{
                opacity: i === current ? 1 : 0,
                transform: `scale(${i === current ? 1 : 0.92})`,
                pointerEvents: i === current ? 'auto' : 'none',
              }}
            >
              <img
                src={img}
                alt={`${title} ${i + 1}`}
                className="max-w-full max-h-[70vh] md:max-h-[75vh] object-contain rounded-2xl shadow-2xl"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Стрелка вправо (только ПК) */}
        {total > 1 && (
          <button
            onClick={goNext}
            className={`hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-white text-2xl transition-all z-30 ${current === total - 1 ? 'opacity-20 pointer-events-none' : ''}`}
          >
            ›
          </button>
        )}
      </div>

      {/* Нижняя панель — миниатюры + точки */}
      <div className="py-4 px-5 flex flex-col items-center gap-3">
        {/* Точки-индикаторы */}
        {total > 1 && (
          <div className="flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`rounded-full transition-all duration-300 ${i === current
                    ? 'w-6 h-2 bg-white'
                    : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                  }`}
              />
            ))}
          </div>
        )}
        <p className="text-white/30 text-xs md:hidden">Свайпайте для навигации</p>
      </div>
    </div>
  );
}
