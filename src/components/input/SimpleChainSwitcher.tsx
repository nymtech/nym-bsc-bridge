import { SwapIcon } from '@hyperlane-xyz/widgets';
import { CHAIN_DISPLAY_NAMES, SUPPORTED_CHAINS } from '../../consts/app';

interface SimpleChainSwitcherProps {
  origin: string;
  destination: string;
  onSwapChains: () => void;
  disabled?: boolean;
}

export function SimpleChainSwitcher({
  origin,
  destination,
  onSwapChains,
  disabled = false
}: SimpleChainSwitcherProps) {
  const getChainInfo = (chainName: string) => {
    if (chainName === SUPPORTED_CHAINS.BSC) {
      return {
        displayName: CHAIN_DISPLAY_NAMES[SUPPORTED_CHAINS.BSC],
        shortName: 'BSC',
        logo: '/bsc-logo.png',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else {
      return {
        displayName: CHAIN_DISPLAY_NAMES[SUPPORTED_CHAINS.NYM],
        shortName: 'NYM',
        logo: '/nym.ico',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200'
      };
    }
  };

  const originInfo = getChainInfo(origin);
  const destinationInfo = getChainInfo(destination);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between gap-4">
        {/* Origin Chain */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">From</div>
          <div className={`flex items-center space-x-3 px-4 py-3 h-16 ${originInfo.bgColor} rounded-lg border ${originInfo.borderColor}`}>
            <img
              src={originInfo.logo}
              alt={originInfo.shortName}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {originInfo.displayName}
              </div>
              <div className="text-xs text-gray-500">
                {originInfo.shortName}
              </div>
            </div>
          </div>
        </div>

        {/* Swap Button - Vertically centered with the chain boxes */}
        <div className="flex flex-col justify-center" style={{ height: '120px' }}>
          <button
            type="button"
            onClick={onSwapChains}
            disabled={disabled}
            className={`p-3 rounded-full transition-all duration-200 border outline-none focus:outline-none flex-shrink-0 ${
              disabled
                ? 'bg-gray-200 border-gray-300 cursor-not-allowed'
                : 'bg-nym-green-primary border-transparent hover:border-nym-green-dark hover:shadow-md active:scale-95'
            }`}
            title="Swap chains"
          >
            <SwapIcon width={20} height={20} color="black" />
          </button>
        </div>

        {/* Destination Chain */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">To</div>
          <div className={`flex items-center space-x-3 px-4 py-3 h-16 ${destinationInfo.bgColor} rounded-lg border ${destinationInfo.borderColor}`}>
            <img
              src={destinationInfo.logo}
              alt={destinationInfo.shortName}
              className="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {destinationInfo.displayName}
              </div>
              <div className="text-xs text-gray-500">
                {destinationInfo.shortName}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
