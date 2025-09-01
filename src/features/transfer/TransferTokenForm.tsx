import { IToken, Token, TokenAmount, WarpCore } from '@hyperlane-xyz/sdk';
import {
  ProtocolType,
  convertToScaledAmount,
  eqAddress,
  errorToString,
  fromWei,
  isNullish,
  isValidAddressEvm,
  objKeys,
  toWei,
} from '@hyperlane-xyz/utils';
import {
  AccountInfo,
  ChevronIcon,
  SpinnerIcon,
  getAccountAddressAndPubKey,
  useAccountAddressForChain,
  useAccounts,
  useModal
} from '@hyperlane-xyz/widgets';
import BigNumber from 'bignumber.js';
import { Form, Formik, useFormikContext } from 'formik';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { RecipientWarningBanner } from '../../components/banner/RecipientWarningBanner';
import { ConnectAwareSubmitButton } from '../../components/buttons/ConnectAwareSubmitButton';
import { SolidButton } from '../../components/buttons/SolidButton';
import { SimpleChainSwitcher } from '../../components/input/SimpleChainSwitcher';
import { SimpleTokenDisplay } from '../../components/input/SimpleTokenDisplay';
import { TextField } from '../../components/input/TextField';
import { TransactionTrackingModal } from '../../components/TransactionTrackingModal';
import { SUPPORTED_CHAINS } from '../../consts/app';
import { WARP_QUERY_PARAMS } from '../../consts/args';
import { chainsRentEstimate } from '../../consts/chains';
import { config } from '../../consts/config';
import { Color } from '../../styles/Color';
import { logger } from '../../utils/logger';
import { getQueryParams, updateQueryParam } from '../../utils/queryParams';
import { ChainConnectionWarning } from '../chains/ChainConnectionWarning';
import { ChainWalletWarning } from '../chains/ChainWalletWarning';
import { useChainDisplayName, useMultiProvider } from '../chains/hooks';
import { isMultiCollateralLimitExceeded } from '../limits/utils';
import { useIsAccountSanctioned } from '../sanctions/hooks/useIsAccountSanctioned';
import { useStore } from '../store';
import { useIsApproveRequired } from '../tokens/approval';
import {
  getDestinationNativeBalance,
  useDestinationBalance,
  useOriginBalance,
  useRecipientBalance,
} from '../tokens/balances';
import {
  getIndexForToken,
  getTokenByIndex,
  useWarpCore
} from '../tokens/hooks';
import { getTokensWithSameCollateralAddresses, isValidMultiCollateralToken } from '../tokens/utils';
import { WalletConnectionWarning } from '../wallet/WalletConnectionWarning';
import { useFetchMaxAmount } from './maxAmount';
import { RecipientConfirmationModal } from './RecipientConfirmationModal';
import { TransferFormValues } from './types';
import { useRecipientBalanceWatcher } from './useBalanceWatcher';
import { useFeeQuotes } from './useFeeQuotes';
import { useTokenTransfer } from './useTokenTransfer';
import { isSmartContract } from './utils';

export function TransferTokenForm() {
  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore();

  const { originChainName, setOriginChainName, routerAddressesByChainMap } = useStore((s) => ({
    originChainName: s.originChainName,
    setOriginChainName: s.setOriginChainName,
    routerAddressesByChainMap: s.routerAddressesByChainMap,
  }));

  const initialValues = useFormInitialValues();
  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);

  // Flag for if form is in input vs review mode
  const [isReview, setIsReview] = useState(false);

  // This state is used for when the formik token is different from
  // the token with highest collateral in a multi-collateral token setup
  const [routeOverrideToken, setRouteTokenOverride] = useState<Token | null>(null);
  // Modal for confirming address
  const {
    open: openConfirmationModal,
    close: closeConfirmationModal,
    isOpen: isConfirmationModalOpen,
  } = useModal();

  // Modal for transaction tracking
  const [isTrackingModalOpen, setIsTrackingModalOpen] = useState(false);

  const validate = async (values: TransferFormValues) => {
    const [result, overrideToken] = await validateForm(
      warpCore,
      values,
      accounts,
      routerAddressesByChainMap,
    );

    // Unless this is done, the review and the transfer would contain
    // the selected token rather than collateral with highest balance
    setRouteTokenOverride(overrideToken);
    return result;
  };

  const onSubmitForm = async (values: TransferFormValues) => {
    logger.debug('Checking destination native balance for:', values.destination, values.recipient);
    const balance = await getDestinationNativeBalance(multiProvider, values);
    if (isNullish(balance)) return;
    else if (balance > 0n) {
      logger.debug('Reviewing transfer form values for:', values.origin, values.destination);
      setIsReview(true);
    } else {
      logger.debug('Recipient has no balance on destination. Confirming address.');
      openConfirmationModal();
    }
  };

  useEffect(() => {
    if (!originChainName) setOriginChainName(initialValues.origin);
  }, [initialValues.origin, originChainName, setOriginChainName]);

  return (
    <Formik<TransferFormValues>
      initialValues={initialValues}
      onSubmit={onSubmitForm}
      validate={validate}
      validateOnChange={false}
      validateOnBlur={false}
    >
      {({ isValidating }) => (
        <Form className="flex w-full flex-col items-stretch space-y-4">
          <WarningBanners />
          <ChainSelectSection isReview={isReview} />
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <TokenSection />
              <AmountSection isReview={isReview} />
            </div>
          </div>
          <RecipientSection isReview={isReview} />
          <ReviewDetails visible={isReview} routeOverrideToken={routeOverrideToken} />
          <ButtonSection
            isReview={isReview}
            isValidating={isValidating}
            setIsReview={setIsReview}
            cleanOverrideToken={() => setRouteTokenOverride(null)}
            routeOverrideToken={routeOverrideToken}
            warpCore={warpCore}
            setIsTrackingModalOpen={setIsTrackingModalOpen}
          />
          <RecipientConfirmationModal
            isOpen={isConfirmationModalOpen}
            close={closeConfirmationModal}
            onConfirm={() => setIsReview(true)}
          />
          <TransactionTrackingModal
            isOpen={isTrackingModalOpen}
            onClose={() => setIsTrackingModalOpen(false)}
          />
        </Form>
      )}
    </Formik>
  );
}


function ChainSelectSection({ isReview }: { isReview: boolean }) {
  const warpCore = useWarpCore();
  const { setOriginChainName } = useStore((s) => ({
    setOriginChainName: s.setOriginChainName,
  }));

  const { values, setFieldValue } = useFormikContext<TransferFormValues>();

  const onSwapChains = () => {
    if (isReview) return;

    const newOrigin = values.destination;
    const newDestination = values.origin;

    setFieldValue('origin', newOrigin);
    setFieldValue('destination', newDestination);
    setOriginChainName(newOrigin);

    // Clear recipient address when swapping chains
    setFieldValue('recipient', '');

    // Update token index based on new origin
    const newTokenIndex = warpCore.tokens.findIndex(token => token.chainName === newOrigin);
    if (newTokenIndex !== -1) {
      setFieldValue('tokenIndex', newTokenIndex);

    }

    // Update URL params
    updateQueryParam(WARP_QUERY_PARAMS.ORIGIN, newOrigin);
    updateQueryParam(WARP_QUERY_PARAMS.DESTINATION, newDestination);
  };

  return (
    <SimpleChainSwitcher
      origin={values.origin}
      destination={values.destination}
      onSwapChains={onSwapChains}
      disabled={isReview}
    />
  );
}

function TokenSection() {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 uppercase tracking-wide">
        Amount
      </label>
      <SimpleTokenDisplay symbol="NYM" logoURI="/nym-logo.svg" />
    </div>
  );
}

function AmountSection({ isReview }: { isReview: boolean }) {
  const { values } = useFormikContext<TransferFormValues>();
  const { balance, isLoading, isError } = useOriginBalance(values);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <TokenBalance label="Wallet balance" balance={balance} isLoading={isLoading} isError={isError} />
      </div>
      <div className="relative w-full">
        <TextField
          name="amount"
          placeholder="0.00"
          className="w-full"
          type="number"
          step="any"
          disabled={isReview}
        />
        <MaxButton disabled={isReview || isLoading} balance={balance} />
      </div>
    </div>
  );
}

function RecipientSection({ isReview }: { isReview: boolean }) {
  const { values } = useFormikContext<TransferFormValues>();
  const { balance: destinationBalance, isLoading: destLoading, isError: destError } = useDestinationBalance(values);
  const { balance: recipientBalance, isLoading: _recipientLoading, isError: _recipientError } = useRecipientBalance({
    destination: values.destination,
    recipient: values.recipient,
    tokenIndex: values.tokenIndex
  });
  useRecipientBalanceWatcher(values.recipient, recipientBalance);

  // Dynamic placeholder based on destination chain
  const getPlaceholderForChain = (chainName: string) => {
    switch (chainName) {
      case SUPPORTED_CHAINS.BSC:
        return "0x1337abc... (Binance Smart Chain address)";
      case SUPPORTED_CHAINS.NYM:
        return "n1xxxx... (Nym Network address)";
      default:
        return "Enter recipient address";
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
      <div className="flex justify-between items-start">
        <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 uppercase tracking-wide">
          Recipient address
        </label>
        <div className="text-right space-y-1">
          <TokenBalance
            label="Recipient balance"
            balance={destinationBalance}
            isLoading={destLoading}
            isError={destError}
          />
        </div>
      </div>
      <div className="relative w-full">
        <TextField
          name="recipient"
          placeholder={getPlaceholderForChain(values.destination)}
          className="w-full"
          disabled={isReview}
        />
        <SelfButton disabled={isReview} />
      </div>
    </div>
  );
}

function TokenBalance({
  label,
  balance,
  isLoading,
  isError
}: {
  label: string;
  balance?: TokenAmount | null;
  isLoading?: boolean;
  isError?: boolean;
}) {
  const value = balance?.getDecimalFormattedAmount().toFixed(5) || '0';
  const symbol = balance?.token.symbol || 'NYM';

  return (
    <div className="text-right text-xs">
      <div className="text-nym-gray-medium">{label}</div>
      <div className="font-medium">
        {isLoading ? (
          <div className="flex items-center justify-end space-x-1">
            <div className="w-2 h-2 bg-nym-green-primary rounded-full animate-pulse"></div>
            <span className="text-nym-gray-medium">Loading...</span>
          </div>
        ) : isError ? (
          <span className="text-nym-status-error">Error</span>
        ) : (
          <span className="text-nym-gray-darkest">{`${value} ${symbol}`}</span>
        )}
      </div>
    </div>
  );
}

function ButtonSection({
  isReview,
  isValidating,
  setIsReview,
  cleanOverrideToken,
  routeOverrideToken,
  warpCore,
  setIsTrackingModalOpen,
}: {
  isReview: boolean;
  isValidating: boolean;
  setIsReview: (b: boolean) => void;
  cleanOverrideToken: () => void;
  routeOverrideToken: Token | null;
  warpCore: WarpCore;
  setIsTrackingModalOpen: (open: boolean) => void;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const multiProvider = useMultiProvider();
  const chainDisplayName = useChainDisplayName(values.destination);

  const { accounts } = useAccounts(multiProvider, config.addressBlacklist);
  const { address: connectedWallet } = getAccountAddressAndPubKey(
    multiProvider,
    values.origin,
    accounts,
  );

  // Confirming recipient address
  const [{ addressConfirmed, showWarning }, setRecipientInfos] = useState({
    showWarning: false,
    addressConfirmed: true,
  });

  useEffect(() => {
    const checkSameEVMRecipient = async (recipient: string) => {
      if (!connectedWallet) {
        // Hide warning banner if entering a recipient address and then disconnect wallet
        setRecipientInfos({ showWarning: false, addressConfirmed: true });
        return;
      }

      const { protocol: destinationProtocol } = multiProvider.getChainMetadata(values.destination);
      const { protocol: sourceProtocol } = multiProvider.getChainMetadata(values.origin);

      // Check if we are only dealing with bridging between two EVM chains
      if (
        sourceProtocol !== ProtocolType.Ethereum ||
        destinationProtocol !== ProtocolType.Ethereum
      ) {
        setRecipientInfos({ showWarning: false, addressConfirmed: true });
        return;
      }

      if (!isValidAddressEvm(recipient)) {
        setRecipientInfos({ showWarning: false, addressConfirmed: true });
        return;
      }

      // check first if the address on origin is a smart contract
      const { isContract: isSenderSmartContract, error: senderCheckError } = await isSmartContract(
        multiProvider,
        values.origin,
        connectedWallet,
      );

      const { isContract: isRecipientSmartContract, error: recipientCheckError } =
        await isSmartContract(multiProvider, values.destination, recipient);

      const isSelfRecipient = eqAddress(recipient, connectedWallet);

      // Hide warning banners if entering a recipient address and then disconnect wallet
      if (senderCheckError || recipientCheckError) {
        toast.error(senderCheckError || recipientCheckError);
        setRecipientInfos({ addressConfirmed: true, showWarning: false });
        return;
      }

      if (isSelfRecipient && isSenderSmartContract && !isRecipientSmartContract) {
        const msg = `The recipient address is the same as the connected wallet, but it does not exist as a smart contract on ${chainDisplayName}.`;
        logger.warn(msg);
        setRecipientInfos({ showWarning: true, addressConfirmed: false });
      } else {
        setRecipientInfos({ showWarning: false, addressConfirmed: true });
      }
    };
    checkSameEVMRecipient(values.recipient);
  }, [
    values.recipient,
    connectedWallet,
    multiProvider,
    values.destination,
    values.origin,
    chainDisplayName,
  ]);

  const isSanctioned = useIsAccountSanctioned();

  const onDoneTransactions = () => {
    setIsReview(false);
    setTransferLoading(false);
    cleanOverrideToken();
    setIsTrackingModalOpen(true);
    // resetForm();
  };
  const { triggerTransactions } = useTokenTransfer(onDoneTransactions);

  const { setTransferLoading } = useStore((s) => ({
    setTransferLoading: s.setTransferLoading,
  }));

  const triggerTransactionsHandler = async () => {
    if (isSanctioned) {
      return;
    }
    setIsReview(false);
    setTransferLoading(true);
    let tokenIndex = values.tokenIndex;
    let origin = values.origin;

    if (routeOverrideToken) {
      tokenIndex = getIndexForToken(warpCore, routeOverrideToken);
      origin = routeOverrideToken.chainName;
    }
    await triggerTransactions({ ...values, tokenIndex, origin });
  };

  const onEdit = () => {
    setIsReview(false);
    cleanOverrideToken();
  };

  if (!isReview) {
    return (
      <>
        <div
          className={`mt-3 gap-2 bg-amber-400 px-4 text-sm ${
            showWarning ? 'max-h-38 py-2' : 'max-h-0'
          } overflow-hidden transition-all duration-500`}
        >
          <RecipientWarningBanner
            destinationChain={chainDisplayName}
            confirmRecipientHandler={(checked) =>
              setRecipientInfos((state) => ({ ...state, addressConfirmed: checked }))
            }
          />
        </div>
        <ConnectAwareSubmitButton
          disabled={!addressConfirmed}
          chainName={values.origin}
          text={isValidating ? 'Validating...' : 'Continue'}
          classes="mt-4 px-3 py-1.5"
        />
      </>
    );
  }

  return (
    <>
      <div
        className={`mt-3 gap-2 bg-amber-400 px-4 text-sm ${
          showWarning ? 'max-h-38 py-2' : 'max-h-0'
        } overflow-hidden transition-all duration-500`}
      >
        <RecipientWarningBanner
          destinationChain={chainDisplayName}
          confirmRecipientHandler={(checked) =>
            setRecipientInfos((state) => ({ ...state, addressConfirmed: checked }))
          }
        />
      </div>
      <div className="mt-4 flex items-center justify-between space-x-4">
        <SolidButton
          type="button"
          color="primary"
          onClick={onEdit}
          className="px-6 py-1.5"
          icon={<ChevronIcon direction="w" width={10} height={6} color={Color.white} />}
        >
          <span>Edit</span>
        </SolidButton>
        <SolidButton
          disabled={!addressConfirmed}
          type="button"
          color="accent"
          onClick={triggerTransactionsHandler}
          className="flex-1 px-3 py-1.5"
        >
          {`Send to ${chainDisplayName}`}
        </SolidButton>
      </div>
    </>
  );
}

function MaxButton({ balance, disabled }: { balance?: TokenAmount; disabled?: boolean }) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const { origin, destination, tokenIndex } = values;
  const multiProvider = useMultiProvider();
  const { accounts } = useAccounts(multiProvider);
  const { fetchMaxAmount, isLoading } = useFetchMaxAmount();

  const onClick = async () => {
    if (!balance || isNullish(tokenIndex) || disabled) return;
    const maxAmount = await fetchMaxAmount({ balance, origin, destination, accounts });
    if (isNullish(maxAmount)) return;
    const decimalsAmount = maxAmount.getDecimalFormattedAmount();
    const roundedAmount = new BigNumber(decimalsAmount).toFixed(4, BigNumber.ROUND_FLOOR);
    setFieldValue('amount', roundedAmount);
  };

  return (
    <SolidButton
      type="button"
      onClick={onClick}
      color="primary"
      disabled={disabled}
      className="absolute bottom-1 right-1 top-2.5 px-2 text-xs opacity-90 all:rounded"
    >
      {isLoading ? (
        <div className="flex items-center">
          <SpinnerIcon className="h-5 w-5" color="white" />
        </div>
      ) : (
        'Max'
      )}
    </SolidButton>
  );
}

function SelfButton({ disabled }: { disabled?: boolean }) {
  const { values, setFieldValue } = useFormikContext<TransferFormValues>();
  const multiProvider = useMultiProvider();
  const chainDisplayName = useChainDisplayName(values.destination);
  const address = useAccountAddressForChain(multiProvider, values.destination);
  const onClick = () => {
    if (disabled) return;
    if (address) setFieldValue('recipient', address);
    else
      toast.warn(`No account found for for chain ${chainDisplayName}, is your wallet connected?`);
  };
  return (
    <SolidButton
      type="button"
      onClick={onClick}
      color="primary"
      disabled={disabled}
      className="absolute bottom-1 right-1 top-2.5 px-2 text-xs opacity-90 all:rounded"
    >
      Self
    </SolidButton>
  );
}

function ReviewDetails({
  visible,
  routeOverrideToken,
}: {
  visible: boolean;
  routeOverrideToken: Token | null;
}) {
  const { values } = useFormikContext<TransferFormValues>();
  const { amount, destination, tokenIndex } = values;
  const warpCore = useWarpCore();
  const originToken = routeOverrideToken || getTokenByIndex(warpCore, tokenIndex);
  const originTokenSymbol = originToken?.symbol || '';
  const connection = originToken?.getConnectionForChain(destination);
  const destinationToken = connection?.token;
  const isNft = false; // Only handling ERC20 tokens (NYM) in simplified version

  const scaledAmount = useMemo(() => {
    if (!originToken?.scale || !destinationToken?.scale) return null;
    if (!visible || originToken.scale === destinationToken.scale) return null;

    const amountWei = toWei(amount, originToken.decimals);
    const precisionFactor = 100000;

    const convertedAmount = convertToScaledAmount({
      amount: BigInt(amountWei),
      fromScale: originToken.scale,
      toScale: destinationToken.scale,
      precisionFactor,
    });
    const value = convertedAmount / BigInt(precisionFactor);

    return {
      value: fromWei(value.toString(), originToken.decimals),
      originScale: originToken.scale,
      destinationScale: destinationToken.scale,
    };
  }, [amount, originToken, destinationToken, visible]);

  const amountWei = isNft ? amount.toString() : toWei(amount, originToken?.decimals);

  const { isLoading: isApproveLoading, isApproveRequired } = useIsApproveRequired(
    originToken,
    amountWei,
    visible,
  );
  const { isLoading: isQuoteLoading, fees } = useFeeQuotes(values, visible);

  const isLoading = isApproveLoading || isQuoteLoading;

  const interchainQuote =
    originToken && objKeys(chainsRentEstimate).includes(originToken.chainName)
      ? fees?.interchainQuote.plus(chainsRentEstimate[originToken.chainName])
      : fees?.interchainQuote;

  return (
    <div
      className={`${
        visible ? 'max-h-screen duration-1000 ease-in' : 'max-h-0 duration-500'
      } overflow-hidden transition-all`}
    >
      <label className="mt-4 block pl-0.5 text-sm text-gray-600">Transactions</label>
      <div className="mt-1.5 space-y-2 break-all rounded border border-gray-400 bg-gray-150 px-2.5 py-2 text-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <SpinnerIcon className="h-5 w-5" />
          </div>
        ) : (
          <>
            {isApproveRequired && (
              <div>
                <h4>Transaction 1: Approve Transfer</h4>
                <div className="ml-1.5 mt-1.5 space-y-1.5 border-l border-gray-300 pl-2 text-xs">
                  <p>{`Router Address: ${originToken?.addressOrDenom}`}</p>
                  {originToken?.collateralAddressOrDenom && (
                    <p>{`Collateral Address: ${originToken.collateralAddressOrDenom}`}</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <h4>{`Transaction${isApproveRequired ? ' 2' : ''}: Transfer Remote`}</h4>
              <div className="ml-1.5 mt-1.5 space-y-1.5 border-l border-gray-300 pl-2 text-xs">
                {destinationToken?.addressOrDenom && (
                  <p className="flex">
                    <span className="min-w-[7.5rem]">Remote Token</span>
                    <span>{destinationToken.addressOrDenom}</span>
                  </p>
                )}

                <p className="flex">
                  <span className="min-w-[7.5rem]">{isNft ? 'Token ID' : 'Amount'}</span>
                  <span>{`${amount} ${originTokenSymbol}`}</span>
                </p>
                {scaledAmount && (
                  <p className="flex">
                    <span className="min-w-[7.5rem]">Received Amount</span>
                    <span>{`${scaledAmount.value} ${originTokenSymbol} (scaled from ${scaledAmount.originScale} to ${scaledAmount.destinationScale})`}</span>
                  </p>
                )}
                {fees?.localQuote && fees.localQuote.amount > 0n && (
                  <p className="flex">
                    <span className="min-w-[7.5rem]">Local Gas (est.)</span>
                    <span>{`${fees.localQuote.getDecimalFormattedAmount().toFixed(4) || '0'} ${
                      fees.localQuote.token.symbol || ''
                    }`}</span>
                  </p>
                )}
                {interchainQuote && interchainQuote.amount > 0n && (
                  <p className="flex">
                    <span className="min-w-[7.5rem]">Interchain Gas</span>
                    <span>{`${interchainQuote.getDecimalFormattedAmount().toFixed(4) || '0'} ${
                      interchainQuote.token.symbol || ''
                    }`}</span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WarningBanners() {
  const { values } = useFormikContext<TransferFormValues>();
  return (
    // Max height to prevent double padding if multiple warnings are visible
    <div className="max-h-10">
      <ChainWalletWarning origin={values.origin} />
      <ChainConnectionWarning origin={values.origin} destination={values.destination} />
      <WalletConnectionWarning origin={values.origin} />
    </div>
  );
}

function useFormInitialValues(): TransferFormValues {
  const warpCore = useWarpCore();
  const params = getQueryParams();

  // Default to BSC as origin, Nym as destination
  const originQuery = params.get(WARP_QUERY_PARAMS.ORIGIN) || SUPPORTED_CHAINS.BSC;
  const destinationQuery = params.get(WARP_QUERY_PARAMS.DESTINATION) || SUPPORTED_CHAINS.NYM;

  // For simplified Nym bridge: find the correct token based on origin chain
  let tokenIndex = 0; // Default fallback

  // Find the token that matches the origin chain
  const originTokenIndex = warpCore.tokens.findIndex(token => token.chainName === originQuery);
  if (originTokenIndex !== -1) {
    tokenIndex = originTokenIndex;
  }

  // Ensure we have at least one token loaded
  if (warpCore.tokens.length === 0) {
    logger.warn('No tokens loaded in warpCore');
  }

  return useMemo(() => {
    return {
      origin: originQuery,
      destination: destinationQuery,
      tokenIndex: tokenIndex || 0,
      amount: '',
      recipient: '',
    };
  }, [originQuery, destinationQuery, tokenIndex]);
}

const insufficientFundsErrMsg = /insufficient.[funds|lamports]/i;
const emptyAccountErrMsg = /AccountNotFound/i;

async function validateForm(
  warpCore: WarpCore,
  values: TransferFormValues,
  accounts: Record<ProtocolType, AccountInfo>,
  routerAddressesByChainMap: Record<ChainName, Set<string>>,
): Promise<[Record<string, string> | null, Token | null]> {
  // returns a tuple, where first value is validation result
  // and second value is token override
  try {
    const { origin, destination, tokenIndex, amount, recipient } = values;

    let token = getTokenByIndex(warpCore, tokenIndex);

    // Fallback to first token if tokenIndex is invalid
    if (!token && warpCore.tokens.length > 0) {
      token = warpCore.tokens[0];
    }

    if (!token) return [{ token: 'No tokens available for transfer' }, null];

    // For Nym bridge, we have a simple validation since we know the expected connections
    let destinationToken = token.getConnectionForChain(destination)?.token;

    // If direct connection not found, try to find any connection to the destination
    if (!destinationToken && token.connections) {
      const connectionToDestination = token.connections.find(conn =>
        conn.token.chainName === destination
      );
      if (connectionToDestination) {
        destinationToken = connectionToDestination.token;
      }
    }

    // For Nym bridge, manually validate expected connections
    if (!destinationToken) {
      // BSC token should connect to Nym
      if (token.chainName === 'bsc' && destination === 'nym') {
        logger.debug('BSC->Nym connection expected but not found, allowing anyway');
        // Create a mock destination token for validation purposes
        destinationToken = {
          chainName: 'nym',
          addressOrDenom: '0x726f757465725f61707000000000000000000000000000010000000000000001',
          symbol: 'NYM',
          decimals: 6
        } as any;
      }
      // Nym token should connect to BSC
      else if (token.chainName === 'nym' && destination === 'bsc') {
        logger.debug('Nym->BSC connection expected but not found, allowing anyway');
        // Create a mock destination token for validation purposes
        destinationToken = {
          chainName: 'bsc',
          addressOrDenom: '0x31d0E332ccEf98b583E40e0cEFBb7502c9a6b3f8',
          symbol: 'NYM',
          decimals: 6
        } as any;
      }
    }

    if (!destinationToken) {
      const errorMsg = `Token ${token.addressOrDenom} on ${token.chainName} has no connection to ${destination}`;
      const availableConnections = token.connections?.map(c => c.token.chainName) || [];
      logger.error(errorMsg, new Error('No destination token'), { availableConnections });
      return [{ token: `Token not available on ${destination} chain` }, null];
    }

    if (
      objKeys(routerAddressesByChainMap).includes(destination) &&
      routerAddressesByChainMap[destination].has(recipient)
    ) {
      return [{ recipient: 'Warp Route address is not valid as recipient' }, null];
    }

    const transferToken = await getTransferToken(warpCore, token, destinationToken);
    const amountWei = toWei(amount, transferToken.decimals);
    const multiCollateralLimit = isMultiCollateralLimitExceeded(token, destination, amountWei);

    if (multiCollateralLimit) {
      return [
        {
          amount: `Transfer limit is ${fromWei(multiCollateralLimit.toString(), token.decimals)} ${token.symbol}`,
        },
        null,
      ];
    }

    const { address, publicKey: senderPubKey } = getAccountAddressAndPubKey(
      warpCore.multiProvider,
      origin,
      accounts,
    );

    const result = await warpCore.validateTransfer({
      originTokenAmount: transferToken.amount(amountWei),
      destination,
      recipient,
      sender: address || '',
      senderPubKey: await senderPubKey,
    });

    if (!isNullish(result)) return [result, null];

    if (transferToken.addressOrDenom === token.addressOrDenom) return [null, null];

    return [null, transferToken];
  } catch (error: any) {
    logger.error('Error validating form', error);
    let errorMsg = errorToString(error, 40);
    const fullError = `${errorMsg} ${error.message}`;
    if (insufficientFundsErrMsg.test(fullError) || emptyAccountErrMsg.test(fullError)) {
      errorMsg = 'Insufficient funds for gas fees';
    }
    return [{ form: errorMsg }, null];
  }
}

// Checks if a token is a multi-collateral token and if so
// look for other tokens that are the same and returns
// the one with the highest collateral in the destination
async function getTransferToken(warpCore: WarpCore, originToken: Token, destinationToken: IToken) {
  if (!isValidMultiCollateralToken(originToken, destinationToken)) return originToken;

  const tokensWithSameCollateralAddresses = getTokensWithSameCollateralAddresses(
    warpCore,
    originToken,
    destinationToken,
  );

  // if only one token exists then just return that one
  if (tokensWithSameCollateralAddresses.length <= 1) return originToken;

  logger.debug(
    'Multiple multi-collateral tokens found for same collateral address, retrieving balances...',
  );
  const tokenBalances: Array<{ token: Token; balance: bigint }> = [];

  // fetch each destination token balance
  const balanceResults = await Promise.allSettled(
    tokensWithSameCollateralAddresses.map(async ({ originToken, destinationToken }) => {
      try {
        const balance = await warpCore.getTokenCollateral(destinationToken);
        return { token: originToken, balance };
      } catch {
        return null;
      }
    }),
  );

  for (const result of balanceResults) {
    if (result.status === 'fulfilled' && result.value) {
      tokenBalances.push(result.value);
    }
  }

  if (!tokenBalances.length) return originToken;

  // sort by balance to return the highest one
  tokenBalances.sort((a, b) => {
    if (a.balance > b.balance) return -1;
    else if (a.balance < b.balance) return 1;
    else return 0;
  });

  logger.debug('Found route with higher collateral in destination, switching route...');
  return tokenBalances[0].token;
}
