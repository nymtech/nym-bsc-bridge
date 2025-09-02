import { WarningIcon } from '@hyperlane-xyz/widgets';

export function InsufficientBalanceBanner({
  requiredAmount,
  currentBalance,
  tokenSymbol,
}: {
  requiredAmount: string;
  currentBalance: string;
  tokenSymbol: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <WarningIcon width={20} height={20} />
      <div>
        <p className="text-sm">
          Insufficient balance: Need {requiredAmount} {tokenSymbol}, have {currentBalance} {tokenSymbol}
        </p>
      </div>
    </div>
  );
}
