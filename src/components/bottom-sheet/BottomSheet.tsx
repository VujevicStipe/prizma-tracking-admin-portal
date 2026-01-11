import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function BottomSheet({ isOpen, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only on handle
    if (!handleRef.current?.contains(e.target as Node)) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!handleRef.current?.contains(e.target as Node)) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${diff}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!handleRef.current?.contains(e.target as Node)) return;
    
    const currentY = e.changedTouches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 100) {
      onClose();
    }
    
    if (sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div 
        ref={sheetRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={handleRef} className={styles.handleArea}>
          <div className={styles.handle} />
        </div>
        <button className={styles.closeButton} onClick={onClose}>✕</button>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BottomSheet;