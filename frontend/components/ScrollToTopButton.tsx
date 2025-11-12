'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible((window.scrollY || document.documentElement.scrollTop) > 200);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      type="button"
      aria-label="Przewiń do góry"
      onClick={handleClick}
      className={[
        'fixed z-50 bottom-6 right-6',
        'rounded-full shadow-lg border border-black/5',
        'bg-blue-600 text-white hover:bg-blue-700',
        'h-12 w-12 flex items-center justify-center',
        'transition-opacity duration-300',
        visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        'dark:bg-blue-500 dark:hover:bg-blue-600',
      ].join(' ')}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}