interface SimpleTokenDisplayProps {
  symbol: string;
  logoURI: string;
}

export function SimpleTokenDisplay({ symbol, logoURI }: SimpleTokenDisplayProps) {
  return (
    <div className="flex items-center space-x-3 p-3 rounded-lg border border-nym-green-lighter/40 transition-all duration-200">
      <img
        src={logoURI}
        alt={`${symbol} token`}
        className="w-10 h-10 rounded-full flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <div className="text-base font-bold text-nym-gray-darkest">{symbol}</div>
        <div className="text-sm text-nym-gray-medium">NYM Token</div>
      </div>
    </div>
  );
}
