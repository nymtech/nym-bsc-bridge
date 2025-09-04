import { useEffect, useState } from 'react';

interface CexWarningPopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export function CexWarningPopup({ isVisible, onClose }: CexWarningPopupProps) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true);
      return;
    } else {
      // Delay hiding to allow for smooth transition
      const timer = setTimeout(() => setShouldShow(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldShow) return null;

  return (
    <div className="relative">
      <div
        className={`absolute top-2 left-0 right-0 z-20 bg-nym-status-warning border border-warning-medium rounded-lg p-3 shadow-lg transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-sm text-warning-medium">
              <p className="font-medium">Do not use exchange/CEX deposit addresses</p>
              <p className="mt-1">
                Using exchange deposit addresses as the recipient may result in{' '}
                <strong>permanent loss of funds</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 text-warning-medium hover:text-warning-dark transition-colors"
            aria-label="Close warning"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
