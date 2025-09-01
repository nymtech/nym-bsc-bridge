import { TokenAmount } from '@hyperlane-xyz/sdk';
import { useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { logger } from '../../utils/logger';
import { useStore } from '../store';
import { TransferStatus } from './types';

export function useRecipientBalanceWatcher(recipient?: Address, balance?: TokenAmount) {
  const { transfers, updateTransferStatus } = useStore((s) => ({
    transfers: s.transfers,
    updateTransferStatus: s.updateTransferStatus,
  }));
  // A crude way to detect transfer completions by triggering
  // toast on recipient balance increase. This is not ideal because it
  // could confuse unrelated balance changes for message delivery
  // TODO replace with a polling worker that queries the hyperlane explorer
  const prevRecipientBalance = useRef<{ balance?: TokenAmount; recipient?: string }>({
    recipient: '',
  });
  
  useEffect(() => {
    // Log balance changes for debugging
    if (recipient && balance) {
      logger.debug('Balance watcher update:', {
        recipient,
        currentBalance: balance.amount.toString(),
        token: balance.token.symbol,
        chain: balance.token.chainName,
        tokenAddress: balance.token.addressOrDenom,
      });
    }

    if (
      recipient &&
      balance &&
      prevRecipientBalance.current.balance &&
      prevRecipientBalance.current.recipient === recipient &&
      balance.token.equals(prevRecipientBalance.current.balance.token) &&
      balance.amount > prevRecipientBalance.current.balance.amount
    ) {
      const increase = balance.amount - prevRecipientBalance.current.balance.amount;
      logger.info('Transfer completion detected:', {
        recipient,
        balanceIncrease: increase.toString(),
        newBalance: balance.amount.toString(),
        token: balance.token.symbol,
        chain: balance.token.chainName,
      });
      
      // Show success toast immediately
      toast.success('Recipient has received funds, transfer complete!');
      
      // Capture current transfer info to avoid closure issues
      const currentTransferIndex = transfers.length - 1;
      const currentTransfer = transfers[currentTransferIndex];
      
      // Add a 3-second delay before marking as delivered to let users see the success message
      setTimeout(() => {
        // Re-check the transfer state to make sure it's still valid
        if (currentTransfer && 
            currentTransfer.recipient === recipient &&
            currentTransfer.status === TransferStatus.ConfirmedTransfer) {
          logger.info('Updating transfer status to Delivered for transfer:', currentTransferIndex);
          updateTransferStatus(currentTransferIndex, TransferStatus.Delivered);
        } else {
          logger.debug('Transfer state changed during timeout, skipping status update');
        }
      }, 3000); // 3 second delay
    }
    
    prevRecipientBalance.current = { balance, recipient: recipient };
  }, [balance, recipient, transfers, updateTransferStatus]);
}
