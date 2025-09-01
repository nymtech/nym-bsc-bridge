import Image from 'next/image';
import Link from 'next/link';
import { ConnectWalletButton } from '../../features/wallet/ConnectWalletButton';

export function Header() {
  return (
    <header className="w-full px-2 pb-2 pt-3 sm:px-6 lg:px-12">
      <div className="flex items-start justify-between">
        <Link href="/" className="flex items-center py-2">
          <Image src="/nym-text-logo.svg" width={92} height={24} alt="NYM" className="mr-2" />          
          <span className="text-lg ml-2 mt-1 font-semibold text-nym-green-primary tracking-wide">Binance  Bridge</span>
        </Link>
        <div className="flex flex-col items-end gap-2 md:flex-row-reverse md:items-start">
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
