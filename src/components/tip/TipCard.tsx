import { IconButton, XCircleIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useState } from 'react';
import InfoCircle from '../../images/icons/info-circle.svg';
import { Card } from '../layout/Card';

export function TipCard() {
  const [show, setShow] = useState(true); // Always show for Nym Bridge
  if (!show) return null;
  return (
    <Card className="w-100 p-3 sm:w-[31rem] bg-gradient-to-r from-nym-green-lighter to-nym-blue-lightest border border-nym-green-primary/20">
      <h2 className="text-nym-green-primary font-semibold">Welcome to Nym Bridge</h2>
      <div className="flex items-end justify-between">
        <p className="mt-2 max-w-[75%] text-sm text-nym-gray-darkest">
          Bridge NYM tokens seamlessly between Binance Smart Chain and Nym Network.
          Fast, secure, and decentralized cross-chain transfers powered by Hyperlane.
        </p>
        <a
          href="https://nym.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-2 flex items-center rounded-lg bg-nym-green-primary px-3 py-1.5 text-xs text-white transition-all hover:bg-nym-green-dark active:scale-95 sm:text-sm"
        >
          <Image src={InfoCircle} width={12} alt="" />
          <span className="ml-1.5 hidden text-sm sm:inline">Learn More</span>
        </a>
      </div>
      <div className="absolute right-3 top-3">
        <IconButton onClick={() => setShow(false)} title="Hide tip" className="hover:rotate-90">
          <XCircleIcon width={16} height={16} />
        </IconButton>
      </div>
    </Card>
  );
}
