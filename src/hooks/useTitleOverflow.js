import { useState, useEffect } from 'react';

export const useTitleOverflow = (tabRef, titleRef, active) => {
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (titleRef.current && tabRef.current) {
      // Temporarily make it visible if it's not, to measure
      const wasHidden = tabRef.current.style.display === 'none';
      if (wasHidden) tabRef.current.style.display = '';

      const checkOverflow = () => {
        if (titleRef.current) {
          // Max width for title is tab width minus padding, status, and buttons
          const tabWidth = tabRef.current.clientWidth;
          const paddingAndControlsWidth = 80; // Approximate (16px padding + 20px status + 24px info + 20px close)
          const maxTitleWidth = tabWidth - paddingAndControlsWidth;
          setIsOverflowing(titleRef.current.scrollWidth > maxTitleWidth);
        }
      };

      checkOverflow();
      
      if (wasHidden) tabRef.current.style.display = 'none';

      const resizeObserver = new ResizeObserver(checkOverflow);
      if (tabRef.current) {
        resizeObserver.observe(tabRef.current);
      }
      return () => resizeObserver.disconnect();
    }
  }, [tabRef, titleRef, active]);

  return isOverflowing;
}; 