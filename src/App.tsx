import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, FormEvent, ReactNode, RefObject } from 'react'
import { submitLead } from './lib/submitLead'

/* -------------------------------------------------------------------------- */
/*  Image URLs — отобранные кадры из /photos (модульные дома и бани CM-HOUSE)  */
/* -------------------------------------------------------------------------- */

const HERO_IMAGE = '/photos/hero-house.jpg?v=3';

const SECTION2_IMAGE = '/photos/baths-dusk.jpg?v=2';

const SECTION3_IMG1 = '/photos/bath-terrace.jpg';
const SECTION3_IMG2 = '/photos/bath-small.jpg';
const SECTION3_BG = '/photos/barrel-snow.jpg';

/* -------------------------------------------------------------------------- */
/*  Gallery photos                                                             */
/* -------------------------------------------------------------------------- */

const GALLERY_PHOTOS = [
  '/photos/gallery-01.jpg',
  '/photos/gallery-02.jpg',
  '/photos/gallery-03.jpg',
  '/photos/gallery-04.jpg',
  '/photos/gallery-05.jpg',
  '/photos/gallery-06.jpg',
  '/photos/gallery-07.jpg',
  '/photos/gallery-08.jpg',
  '/photos/gallery-09.jpg',
  '/photos/gallery-10.jpg',
  '/photos/gallery-11.jpg',
  '/photos/gallery-12.jpg',
];

/* -------------------------------------------------------------------------- */
/*  Data constants                                                            */
/* -------------------------------------------------------------------------- */

const PHONE = '8 963 049 29 19';
const PHONE_HREF = 'tel:+79630492919';
// TODO: замени на ссылку канала заказчика, когда будет известна
const TELEGRAM_HREF = 'https://t.me/cmhouse';

const featureBars = ['Дома под ключ', 'Модульные бани', 'Монтаж за 1 день'];

const services = [
  { name: 'Модульные\nдома', num: '01', active: true },
  { name: 'Модульные\nбани', num: '02', active: false },
  { name: 'Готовые\nкомплексы', num: '03', active: false },
  { name: 'Хозяйственные\nблоки', num: null, active: false },
];

const navLinks = [
  { label: 'Главная', href: '#hero' },
  { label: 'Проекты', href: '#projects' },
  { label: 'О нас', href: '#about' },
  { label: 'Галерея', href: '#gallery' },
  { label: 'Заявка', href: '#request' },
  { label: 'Контакты', href: '#contacts' },
];

const stats = [
  { value: '8+', label: 'лет опыта' },
  { value: '350+', label: 'объектов сдано' },
  { value: '1', label: 'день монтаж' },
  { value: '5', label: 'лет гарантия' },
];

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                     */
/* -------------------------------------------------------------------------- */

type MaskPos = { x: number; y: number; sw: number; sh: number };

/** Позиции карточек относительно секции + размеры секции. */
function useMaskPositions(
  sectionRef: RefObject<HTMLElement | null>,
  cardsRef: RefObject<(HTMLElement | null)[]>,
): MaskPos[] {
  const [positions, setPositions] = useState<MaskPos[]>([]);

  const measure = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const sRect = section.getBoundingClientRect();
    const next: MaskPos[] = (cardsRef.current ?? []).map((card) => {
      if (!card) return { x: 0, y: 0, sw: sRect.width, sh: sRect.height };
      const cRect = card.getBoundingClientRect();
      return {
        x: cRect.left - sRect.left,
        y: cRect.top - sRect.top,
        sw: sRect.width,
        sh: sRect.height,
      };
    });
    setPositions(next);
  }, [sectionRef, cardsRef]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(section);
    return () => {
      ro.disconnect();
    };
  }, [sectionRef, measure]);

  return positions;
}

/** Размер фонового изображения, чтобы оно покрывало всю секцию (cover). */
function useImageCover(src: string, sectionWidth: number, sectionHeight: number) {
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!sectionWidth || !sectionHeight) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.max(sectionWidth / img.naturalWidth, sectionHeight / img.naturalHeight);
      setSize({
        w: img.naturalWidth * scale,
        h: img.naturalHeight * scale
      });
    };
    img.src = src;
  }, [src, sectionWidth, sectionHeight]);

  return size;
}



function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/** Поочерёдное появление дочерних элементов при входе секции во вьюпорт. */
function useStaggeredReveal(count: number, threshold = 0.15) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const getAnimStyle = useCallback(
    (index: number): CSSProperties => ({
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(24px)',
      transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${
        Math.min(index, count - 1) * 120
      }ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${
        Math.min(index, count - 1) * 120
      }ms`,
    }),
    [visible, count],
  );

  return { containerRef, getAnimStyle };
}

/* -------------------------------------------------------------------------- */
/*  MaskedCard — «окошко» в общее фоновое изображение                          */
/* -------------------------------------------------------------------------- */

type MaskedCardProps = {
  bgImage: string;
  position: MaskPos | undefined;
  imageSize: { w: number; h: number };
  focalX: number;
  focalY?: number;

  className?: string;
  children?: ReactNode;
  cardRef?: (el: HTMLDivElement | null) => void;
  style?: CSSProperties;
};

function MaskedCard({
  bgImage,
  position,
  imageSize,
  focalX,
  focalY = 0.5,

  className = '',
  children,
  cardRef,
  style,
}: MaskedCardProps) {
  const overflowX = position && imageSize.w > position.sw ? imageSize.w - position.sw : 0;
  const overflowY = position && imageSize.h > position.sh ? imageSize.h - position.sh : 0;
  
  const offsetX = overflowX * focalX;
  const offsetY = overflowY * focalY;

  // Parallax disabled to prevent background clipping on scroll
  const bgStyle: CSSProperties = position
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: `${imageSize.w}px ${imageSize.h}px`,
        backgroundPosition: `-${position.x + offsetX}px -${position.y + offsetY}px`,
        backgroundRepeat: 'no-repeat',
      }
    : {};

  return (
    <div ref={cardRef} className={className} style={{ ...bgStyle, ...style }}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Arrow icon (inline SVG, no icon libraries)                                */
/* -------------------------------------------------------------------------- */

function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={`rotate-[-45deg] ${className}`}
    >
      <path
        d="M1 7h12m0 0L8 2m5 5L8 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lead form (modal + inline)                                                */
/* -------------------------------------------------------------------------- */

const ModalContext = createContext<() => void>(() => {})

function useOpenModal() {
  return useContext(ModalContext)
}

const INTEREST_OPTIONS = ['Баня', 'Модульный дом', 'Другое'] as const

function LeadForm({ idPrefix }: { idPrefix: string }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState<string>(INTEREST_OPTIONS[0])
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) {
      setError('Заполните имя и телефон')
      return
    }
    setError('')
    setState('sending')
    await submitLead({ name, phone, interest, comment })
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <div className="rounded-2xl bg-stone-50 p-6 md:p-8 text-center">
        <div className="text-2xl md:text-3xl font-bold text-black mb-2">
          Заявка отправлена!
        </div>
        <p className="text-sm md:text-base text-neutral-600">
          Мы свяжемся с вами в ближайшее время по номеру{' '}
          <span className="font-semibold text-black">{phone}</span>.
        </p>
      </div>
    )
  }

  const inputCls =
    'w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm md:text-base text-black placeholder:text-neutral-400 outline-none transition-colors duration-200 focus:border-black'

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div>
          <label htmlFor={`${idPrefix}-name`} className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
            Имя *
          </label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Как к вам обращаться"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-phone`} className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
            Телефон *
          </label>
          <input
            id={`${idPrefix}-phone`}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-interest`} className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
          Что вас интересует?
        </label>
        <select
          id={`${idPrefix}-interest`}
          value={interest}
          onChange={(e) => setInterest(e.target.value)}
          className={inputCls}
        >
          {INTEREST_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-comment`} className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">
          Комментарий
        </label>
        <textarea
          id={`${idPrefix}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Размер, планировка, сроки — всё, что важно"
          rows={3}
          className={`${inputCls} resize-none`}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={state === 'sending'}
        className="mt-1 px-8 py-4 bg-black rounded-full text-white text-sm md:text-base font-semibold hover:bg-neutral-800 hover:scale-[1.02] active:scale-100 transition-all duration-200 disabled:opacity-60 disabled:hover:scale-100"
      >
        {state === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
      <p className="text-xs text-neutral-400">
        Нажимая кнопку, вы соглашаетесь на обработку указанных данных для связи с вами.
      </p>
    </form>
  )
}

function RequestModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handler)
    }
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-[300] flex items-center justify-center p-4 transition-opacity duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 md:p-8 max-h-[90vh] overflow-y-auto transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-y-0 scale-100' : 'translate-y-6 scale-95'
        }`}
      >
        <button
          aria-label="Закрыть"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 hover:text-black transition-colors text-xl leading-none"
        >
          ×
        </button>
        <h3 className="text-2xl md:text-3xl font-bold text-black mb-1 pr-10">
          Заявка на дом или баню
        </h3>
        <p className="text-sm text-neutral-500 mb-5">
          Перезвоним в течение 15 минут в рабочее время
        </p>
        <LeadForm idPrefix="modal" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Navbar                                                                    */
/* -------------------------------------------------------------------------- */

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const openModal = useOpenModal();

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 transition-all duration-300 ${
        scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white/80 backdrop-blur-md'
      }`}>
        {/* logo */}
        <a href="#hero" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="CM-HOUSE" className="h-9 md:h-11 w-auto rounded-md object-cover" />
          <div className="flex flex-col">
            <div className="text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none">
              CM
            </div>
            <div className="-mt-1.5 md:-mt-2 text-xl md:text-2xl font-extrabold uppercase tracking-tight leading-none">
              House
            </div>
            <div className="text-[8px] md:text-[9px] font-medium leading-none mt-1.5 md:mt-2">
              качество · комфорт · красота
            </div>
          </div>
        </a>

        {/* desktop nav */}
        <div className="hidden md:block">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-black transition-colors duration-200 rounded-lg hover:bg-black/5"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <a href={PHONE_HREF} className="px-6 py-3 bg-black rounded-full text-white text-sm font-semibold hover:bg-neutral-800 transition-colors duration-200">
              {PHONE}
            </a>
          </div>
        </div>

        {/* mobile hamburger */}
        <button
          aria-label="Меню"
          className="md:hidden w-10 h-10 flex items-center justify-center relative"
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              open ? 'rotate-45 translate-y-0' : '-translate-y-2'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              open ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
            }`}
          />
          <span
            className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
              open ? '-rotate-45 translate-y-0' : 'translate-y-2'
            }`}
          />
        </button>
      </header>

      {/* mobile overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`text-4xl font-bold text-black hover:text-neutral-500 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
            <div
              className={`mt-8 pt-8 border-t border-neutral-200 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: open ? '450ms' : '0ms' }}
            >
              <a href={PHONE_HREF} className="block text-lg font-semibold text-black mb-4">
                {PHONE}
              </a>
              <button
                onClick={() => { setOpen(false); openModal(); }}
                className="w-full block text-center px-6 py-4 bg-black rounded-full text-white text-sm font-semibold hover:bg-neutral-800 transition-colors duration-200"
              >
                Оставить заявку
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 1 — Hero                                                          */
/* -------------------------------------------------------------------------- */

function Section1({ focalX }: { focalX: number }) {
  const openModal = useOpenModal();
  const section1Ref = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const s1Reveal = useStaggeredReveal(4);
  const positions = useMaskPositions(section1Ref, cardsRef);


  const sectionW = positions[0]?.sw ?? 0;
  const sectionH = positions[0]?.sh ?? 0;
  const imageSize = useImageCover(HERO_IMAGE, sectionW, sectionH);

  const setCard = (i: number) => (el: HTMLDivElement | null) => {
    cardsRef.current[i] = el;
  };

  return (
    <section
      id="hero"
      ref={(el) => {
        section1Ref.current = el;
        s1Reveal.containerRef.current = el;
      }}
      className="h-screen w-full overflow-hidden flex flex-col pt-16 md:pt-20 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      {featureBars.map((label, i) => (
        <MaskedCard
          key={label}
          bgImage={HERO_IMAGE}
          position={positions[i]}
          imageSize={imageSize}
          focalX={focalX}

          cardRef={setCard(i)}
          style={s1Reveal.getAnimStyle(i)}
          className="group w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative transition-transform duration-500 hover:scale-[1.01] cursor-default"
        >
          {/* Semi-transparent overlay for text readability */}
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] transition-all duration-500 group-hover:bg-white/40 group-hover:backdrop-blur-[1px]" />
          <span className="flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center relative z-10 transition-transform duration-500 group-hover:scale-105">
            {label}
          </span>
        </MaskedCard>
      ))}

      <MaskedCard
        bgImage={HERO_IMAGE}
        position={positions[3]}
        imageSize={imageSize}
        focalX={focalX}

        cardRef={setCard(3)}
        style={s1Reveal.getAnimStyle(3)}
        className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
      >
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent transition-opacity duration-700" />

        <div className="absolute top-4 left-4 md:top-7 md:left-7 z-10">
          <span className="inline-block text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] bg-black/30 backdrop-blur-sm rounded-lg px-3 py-2 transition-opacity duration-500 hover:opacity-80">
            Мы строим модульные дома и бани, <br />
            которые не нужно достраивать
          </span>
        </div>

        <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10 group cursor-default">
          <span className="block text-white text-xs md:text-sm font-semibold mb-1 md:mb-2 opacity-90 transition-opacity duration-300 group-hover:opacity-100">
            Производство полного цикла
          </span>
          <h1 className="text-white text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.79] tracking-tight drop-shadow-lg transition-transform duration-700 ease-out group-hover:scale-[1.02] origin-bottom-left">
            Дома
            <br />
            и Бани
          </h1>
        </div>

        <button
          onClick={openModal}
          className="absolute bottom-6 right-4 md:bottom-10 md:right-8 z-10 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-sm md:text-base font-bold transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:-translate-y-1 hover:scale-105 active:scale-95"
        >
          Бесплатный расчёт →
        </button>
      </MaskedCard>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 2 — Gallery / Projects                                            */
/* -------------------------------------------------------------------------- */

function Section2({ focalX }: { focalX: number }) {
  const section2Ref = useRef<HTMLElement | null>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const s2Reveal = useStaggeredReveal(4);
  const positions = useMaskPositions(section2Ref, cardsRef);


  const sectionW = positions[0]?.sw ?? 0;
  const sectionH = positions[0]?.sh ?? 0;
  const imageSize = useImageCover(SECTION2_IMAGE, sectionW, sectionH);

  const setCard = (i: number) => (el: HTMLDivElement | null) => {
    cardsRef.current[i] = el;
  };

  return (
    <section
      id="projects"
      ref={(el) => {
        section2Ref.current = el;
        s2Reveal.containerRef.current = el;
      }}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[0]}
          imageSize={imageSize}
          focalX={focalX}

          cardRef={setCard(0)}
          style={s2Reveal.getAnimStyle(0)}
          className="group rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0 cursor-default"
        >
          <div className="absolute inset-0 bg-black/30 transition-colors duration-500 group-hover:bg-black/20" />
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white text-2xl md:text-3xl font-bold z-10 transition-transform duration-500 group-hover:translate-x-2">
            Наши работы
          </h2>
          <span className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white text-xs md:text-sm font-semibold z-10 transition-transform duration-500 group-hover:translate-x-2 group-hover:text-white/90">
            Готовые объекты заказчикам
          </span>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[1]}
          imageSize={imageSize}
          focalX={focalX}

          cardRef={setCard(1)}
          style={s2Reveal.getAnimStyle(1)}
          className="group md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-500 group-hover:opacity-90" />
          <div className="absolute bottom-16 left-5 md:bottom-24 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10 transition-transform duration-500 group-hover:-translate-y-1">
            Хотите дом или баню под ключ <br />
            за один сезон?
          </div>
          <a
            href={PHONE_HREF}
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold z-10 transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.25)] hover:-translate-y-1 hover:scale-105 active:scale-95"
          >
            Позвонить
          </a>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[2]}
          imageSize={imageSize}
          focalX={focalX}

          cardRef={setCard(2)}
          style={s2Reveal.getAnimStyle(2)}
          className="group rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0 cursor-default"
        >
          <div className="absolute inset-0 bg-black/20 transition-colors duration-500 group-hover:bg-black/10" />
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9] z-10 drop-shadow-lg transition-transform duration-700 group-hover:scale-105 origin-top-left">
            Под
            <br />
            ключ
          </h2>
        </MaskedCard>

        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[3]}
          imageSize={imageSize}
          focalX={focalX}

          cardRef={setCard(3)}
          style={s2Reveal.getAnimStyle(3)}
          className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <div className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-1.5 md:gap-2 p-2 md:p-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className={`group flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between transition-all duration-500 hover:-translate-y-1 hover:shadow-xl cursor-default ${
                  svc.active ? 'bg-white/90 backdrop-blur-md' : 'bg-white/10 hover:bg-white/20 backdrop-blur-xl'
                }`}
              >
                <h3
                  className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line transition-transform duration-500 group-hover:scale-[1.02] origin-left ${
                    svc.active ? 'text-black' : 'text-white'
                  }`}
                >
                  {svc.name}
                </h3>
                {svc.num && (
                  <div
                    className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold transition-all duration-500 group-hover:rotate-12 ${
                      svc.active ? 'border-black text-black' : 'border-white text-white'
                    }`}
                  >
                    {svc.num}
                  </div>
                )}
              </div>
            ))}
          </div>
        </MaskedCard>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section 3 — Baths                                                         */
/* -------------------------------------------------------------------------- */

function Section3() {
  const openModal = useOpenModal();
  const s3Reveal = useStaggeredReveal(4);

  return (
    <section
      ref={s3Reveal.containerRef as RefObject<HTMLElement>}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div
            style={s3Reveal.getAnimStyle(0)}
            className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
          >
            <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black">
              Баня
              <br />
              под ключ
            </h2>
            <p className="text-xs md:text-sm font-semibold text-black">
              Каркас, печь, отделка — включено
            </p>
          </div>

          <div
            style={s3Reveal.getAnimStyle(1)}
            className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
          >
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={SECTION3_IMG1}
                alt="Модульная баня в лесу"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={SECTION3_IMG2}
                alt="Компактная модульная баня"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div
            style={s3Reveal.getAnimStyle(2)}
            className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex flex-col justify-between flex-[0.8] min-h-[160px] md:min-h-0"
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-black/60 mb-1.5">
                Готовая модель
              </p>
              <h3 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7 mb-2 md:mb-3">
                Баня 4,5×2,45 м
                <br />
                под ключ
              </h3>
              <p className="text-[11px] md:text-xs text-neutral-600 leading-4">
                Имитация бруса + вагонка штиль 110 мм
                <span className="hidden md:inline"> • </span>
                <br className="md:hidden" />
                Парная из липы, печь с каменкой, бак 50 л
              </p>
            </div>
            <button
              onClick={openModal}
              className="mt-3 md:mt-4 self-start px-6 py-2.5 md:px-8 md:py-3 bg-white rounded-full text-black text-sm md:text-base font-bold hover:scale-105 transition-transform shadow-md"
            >
              Заказать
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={s3Reveal.getAnimStyle(3)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0"
        >
          <img
            src={SECTION3_BG}
            alt="Модульная баня-бочка"
            loading="lazy"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
            <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
              <h4 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7">
                Каркас
                <br />
                из сухой
                <br />
                доски
              </h4>
              <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center">
                <ArrowIcon />
              </div>
            </div>
            <div className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
              <h4 className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                Печь
                <br />
                и вынос
                <br />
                топки
              </h4>
              <div className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center text-white">
                <ArrowIcon className="text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section — About                                                           */
/* -------------------------------------------------------------------------- */

function SectionAbout() {
  const openModal = useOpenModal();
  const reveal = useStaggeredReveal(5);

  return (
    <section
      id="about"
      ref={reveal.containerRef as RefObject<HTMLElement>}
      className="w-full px-3 md:px-5 py-16 md:py-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div style={reveal.getAnimStyle(0)} className="mb-10 md:mb-16">
          <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-3">
            О компании
          </p>
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-black leading-[0.95]">
            CM-HOUSE
          </h2>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 mb-12 md:mb-20">
          <div style={reveal.getAnimStyle(1)}>
            <p className="text-base md:text-lg text-neutral-700 leading-relaxed">
              Мы — производственная компания, которая создаёт модульные дома и бани
              полного цикла: от проектирования до сдачи готового объекта. Строим
              в цехе около месяца, монтируем на участке за&nbsp;1&nbsp;день. Работаем
              по всей России с доставкой и монтажом.
            </p>
          </div>
          <div style={reveal.getAnimStyle(2)}>
            <p className="text-base md:text-lg text-neutral-700 leading-relaxed">
              Используем только сухую строганную доску камерной сушки. Каждый проект
              проходит контроль качества на всех этапах — от каркаса до финишной
              отделки. Вы получаете готовый дом или баню без доделок.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div
          style={reveal.getAnimStyle(3)}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-stone-50 rounded-2xl p-5 md:p-7 text-center"
            >
              <div className="text-3xl md:text-5xl font-bold text-black mb-1 md:mb-2">
                {stat.value}
              </div>
              <div className="text-xs md:text-sm font-medium text-neutral-500">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={reveal.getAnimStyle(4)} className="mt-10 md:mt-16 flex flex-wrap gap-4">
          <button
            onClick={openModal}
            className="px-8 py-4 bg-black rounded-full text-white text-sm md:text-base font-semibold hover:bg-neutral-800 transition-colors duration-200"
          >
            Оставить заявку
          </button>
          <a
            href={PHONE_HREF}
            className="px-8 py-4 bg-white border border-black rounded-full text-black text-sm md:text-base font-semibold hover:bg-black hover:text-white transition-colors duration-200"
          >
            {PHONE}
          </a>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section — Gallery                                                         */
/* -------------------------------------------------------------------------- */

function SectionGallery() {
  const [showAll, setShowAll] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const reveal = useStaggeredReveal(6);

  const visiblePhotos = showAll ? GALLERY_PHOTOS : GALLERY_PHOTOS.slice(0, 6);

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [lightboxIndex]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') setLightboxIndex((prev) => prev !== null ? (prev + 1) % GALLERY_PHOTOS.length : null);
      if (e.key === 'ArrowLeft') setLightboxIndex((prev) => prev !== null ? (prev - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIndex]);

  return (
    <section
      id="gallery"
      ref={reveal.containerRef as RefObject<HTMLElement>}
      className="w-full px-3 md:px-5 py-16 md:py-24"
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div style={reveal.getAnimStyle(0)} className="mb-10 md:mb-16 flex items-end justify-between">
          <div>
            <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-3">
              Фотогалерея
            </p>
            <h2 className="text-4xl md:text-6xl font-bold text-black leading-[0.95]">
              Наши работы
            </h2>
          </div>
          <span className="hidden md:block text-sm text-neutral-400 font-medium">
            {GALLERY_PHOTOS.length} фото
          </span>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
          {visiblePhotos.map((src, i) => (
            <div
              key={src}
              style={reveal.getAnimStyle(Math.min(i, 5))}
              className="aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => setLightboxIndex(i)}
            >
              <img
                src={src}
                alt={`Проект CM-HOUSE ${i + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Show more */}
        {!showAll && GALLERY_PHOTOS.length > 6 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowAll(true)}
              className="px-8 py-4 bg-stone-100 rounded-full text-black text-sm md:text-base font-semibold hover:bg-stone-200 transition-colors duration-200"
            >
              Показать ещё {GALLERY_PHOTOS.length - 6} фото
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-2xl z-10"
            onClick={() => setLightboxIndex(null)}
          >
            ✕
          </button>

          {/* Prev */}
          <button
            className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xl z-10"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) => prev !== null ? (prev - 1 + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length : null);
            }}
          >
            ‹
          </button>

          {/* Image */}
          <img
            src={GALLERY_PHOTOS[lightboxIndex]}
            alt={`Проект ${lightboxIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
            loading="lazy"
          />

          {/* Next */}
          <button
            className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors text-xl z-10"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((prev) => prev !== null ? (prev + 1) % GALLERY_PHOTOS.length : null);
            }}
          >
            ›
          </button>

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
            {lightboxIndex + 1} / {GALLERY_PHOTOS.length}
          </div>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Section — Request form (inline)                                           */
/* -------------------------------------------------------------------------- */

function SectionRequest() {
  const reveal = useStaggeredReveal(2);

  return (
    <section
      id="request"
      ref={reveal.containerRef as RefObject<HTMLElement>}
      className="w-full px-3 md:px-5 py-16 md:py-24 bg-stone-50"
    >
      <div className="max-w-3xl mx-auto">
        <div style={reveal.getAnimStyle(0)} className="text-center mb-8 md:mb-12">
          <p className="text-xs md:text-sm font-semibold text-neutral-500 uppercase tracking-widest mb-3">
            Заявка
          </p>
          <h2 className="text-4xl md:text-6xl font-bold text-black leading-[0.95] mb-4">
            Оставьте заявку
          </h2>
          <p className="text-base md:text-lg text-neutral-600 leading-relaxed">
            Модульный дом 7×5 м мы проектируем и строим в цехе за месяц,
            а монтируем на вашем участке за 1 день. Расскажите, что нужно вам, —
            перезвоним в течение 15 минут в рабочее время.
          </p>
        </div>
        <div style={reveal.getAnimStyle(1)} className="bg-white rounded-3xl p-5 md:p-8 shadow-sm">
          <LeadForm idPrefix="request" />
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*  Footer                                                                    */
/* -------------------------------------------------------------------------- */

function Footer() {
  const openModal = useOpenModal();

  return (
    <footer id="contacts" className="w-full bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20">
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16 mb-12 md:mb-20">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <img src="/logo.jpg" alt="CM-HOUSE" className="h-11 w-auto rounded-md object-cover brightness-150" />
              <div className="flex flex-col">
                <div className="text-2xl font-extrabold uppercase tracking-tight leading-none">CM</div>
                <div className="-mt-2 text-2xl font-extrabold uppercase tracking-tight leading-none">House</div>
              </div>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Модульные дома и бани под ключ.<br />
              Производство полного цикла с доставкой по всей России.
            </p>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">
              Контакты
            </h4>
            <div className="space-y-3">
              <a href={PHONE_HREF} className="block text-xl md:text-2xl font-bold hover:text-neutral-300 transition-colors">
                {PHONE}
              </a>
              <p className="text-sm text-neutral-400">
                Ежедневно с 9:00 до 21:00
              </p>
              <div className="flex gap-3 pt-2">
                <a
                  href={TELEGRAM_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                >
                  Telegram
                </a>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-widest mb-4">
              Навигация
            </h4>
            <div className="space-y-2">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Bar */}
        <div className="bg-white/5 rounded-2xl p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 md:mb-20">
          <div>
            <h3 className="text-xl md:text-2xl font-bold mb-2">Рассчитать стоимость проекта</h3>
            <p className="text-sm text-neutral-400">Бесплатная консультация и расчёт за 15 минут</p>
          </div>
          <button
            onClick={openModal}
            className="px-8 py-4 bg-white rounded-full text-black text-sm md:text-base font-bold hover:bg-neutral-200 transition-colors shrink-0"
          >
            Оставить заявку
          </button>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/10">
          <p className="text-xs text-neutral-500">
            © {new Date().getFullYear()} CM-HOUSE. Все права защищены.
          </p>
          <p className="text-xs text-neutral-500">
            Модульные дома и бани под ключ
          </p>
        </div>
      </div>
    </footer>
  );
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */

export default function App() {
  const isMobile = useIsMobile();
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const s1Focal = isMobile ? 0.7 : 0.8;
  const s2Focal = isMobile ? 0.65 : 0.8;

  return (
    <ModalContext.Provider value={openModal}>
      <div className="bg-white">
        <Navbar />
        <Section1 focalX={s1Focal} />
        <Section2 focalX={s2Focal} />
        <Section3 />
        <SectionAbout />
        <SectionGallery />
        <SectionRequest />
        <Footer />
      </div>
      <RequestModal open={modalOpen} onClose={closeModal} />
    </ModalContext.Provider>
  );
}
