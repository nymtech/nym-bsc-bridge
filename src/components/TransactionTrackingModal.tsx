import { SpinnerIcon } from '@hyperlane-xyz/widgets';
import { useEffect, useState } from 'react';
import { CHAIN_DISPLAY_NAMES } from '../consts/app';
import { useStore } from '../features/store';
import { TransferStatus } from '../features/transfer/types';

interface TransactionTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionTrackingModal({ isOpen, onClose }: TransactionTrackingModalProps) {
  const { transfers } = useStore((s) => ({ transfers: s.transfers }));
  const [currentTransfer, setCurrentTransfer] = useState(transfers[transfers.length - 1]);
  const [timeRemaining, setTimeRemaining] = useState(180); // 3 minutes in seconds
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    if (transfers.length > 0) {
      setCurrentTransfer(transfers[transfers.length - 1]);
    }
  }, [transfers]);

  // Countdown timer effect
  useEffect(() => {
    if (!isOpen || !currentTransfer) return;

    // Reset timer when modal opens
    setTimeRemaining(180);
    setIsTimeout(false);

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimeout(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, currentTransfer]);

  // Close modal when transfer is actually delivered to recipient
  useEffect(() => {
    if (currentTransfer && currentTransfer.status === TransferStatus.Delivered) {
      // 4-second delay to show completion state before closing (longer than balance watcher delay)
      const closeTimer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(closeTimer);
    }
    return undefined;
  }, [currentTransfer, onClose]);

  // Note: Removed toast interception as we now properly update transfer status via balance watcher

  if (!isOpen || !currentTransfer) return null;

  const isCompleted = currentTransfer.status === TransferStatus.Delivered;
  const isFailed = currentTransfer.status === TransferStatus.Failed;
  const isWaitingForDelivery = currentTransfer.status === TransferStatus.ConfirmedTransfer;
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-nym-gray-darkest">Transfer in Progress</h2>
          <button
            onClick={onClose}
            className="text-nym-gray-medium hover:text-nym-gray-darkest"
            disabled={!isCompleted && !isFailed && !isTimeout}
          >
            ✕
          </button>
        </div>

        {/* Transfer Info */}
        <div className="mb-8 rounded-lg bg-nym-blue-lightest p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-nym-gray-medium">Amount</span>
            <span className="font-medium text-nym-gray-darkest">
              {currentTransfer.amount} NYM
            </span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-nym-gray-medium">From</span>
            <span className="font-medium text-nym-gray-darkest">
              {CHAIN_DISPLAY_NAMES[currentTransfer.origin as keyof typeof CHAIN_DISPLAY_NAMES] || currentTransfer.origin}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-nym-gray-medium">To</span>
            <span className="font-medium text-nym-gray-darkest">
              {CHAIN_DISPLAY_NAMES[currentTransfer.destination as keyof typeof CHAIN_DISPLAY_NAMES] || currentTransfer.destination}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center">
          {isFailed ? (
            <div className="mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nym-status-error bg-opacity-10 mx-auto mb-4">
                <span className="text-2xl text-nym-status-error">✕</span>
              </div>
              <h3 className="text-lg font-medium text-nym-status-error mb-2">Transfer Failed</h3>
              <p className="text-sm text-nym-gray-medium">
                There was an error processing your transfer. Please try again.
              </p>
            </div>
          ) : isCompleted ? (
            <div className="mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nym-green-primary bg-opacity-10 mx-auto mb-4">
                <span className="text-2xl text-nym-green-primary">✓</span>
              </div>
              <h3 className="text-lg font-medium text-nym-green-primary mb-2">Transfer Complete!</h3>
              <p className="text-sm text-nym-gray-medium">
                Your NYM tokens have been successfully transferred.
              </p>
            </div>
          ) : isWaitingForDelivery ? (
            <div className="mb-8">
              {/* Spinner */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nym-blue-medium bg-opacity-10 mx-auto mb-6">
                <SpinnerIcon className="h-8 w-8 animate-spin" color="#2362C1" />
              </div>

              {/* Status Text */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-nym-gray-darkest mb-2">
                  Waiting for recipient to receive funds
                </h3>
                <p className="text-sm text-nym-gray-medium">
                  {isTimeout 
                    ? "This transaction is taking longer than expected. Please check your transaction status in your wallet or block explorer."
                    : "Your transfer is being processed on the blockchain. You'll be notified when the recipient receives the funds."
                  }
                </p>
              </div>

              {/* Countdown Timer */}
              {!isTimeout && (
                <div className="mb-4">
                  <div className="text-3xl font-mono font-bold text-nym-blue-medium mb-2">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-xs text-nym-gray-medium">
                    Expected completion time
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {!isTimeout && (
                <div className="w-full bg-nym-gray-lightest rounded-full h-2">
                  <div 
                    className="bg-nym-blue-medium h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${((180 - timeRemaining) / 180) * 100}%` }}
                  ></div>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6">
              {/* Show for other statuses like Preparing, CreatingTxs, etc. */}
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nym-blue-medium bg-opacity-10 mx-auto mb-6">
                <SpinnerIcon className="h-8 w-8 animate-spin" color="#2362C1" />
              </div>
              <h3 className="text-lg font-medium text-nym-gray-darkest mb-2">
                Processing Transfer
              </h3>
              <p className="text-sm text-nym-gray-medium">
                Your transfer is being prepared. Please wait...
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {(isCompleted || isFailed || isTimeout) && (
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-nym-blue-medium py-3 px-4 text-sm font-medium text-white hover:bg-nym-blue-dark"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}