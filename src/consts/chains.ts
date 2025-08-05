import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';
import { Address } from '@hyperlane-xyz/utils';

// A map of chain names to ChainMetadata
// Only using chains defined in chains.yaml, leaving this empty
// Schema here: https://github.com/hyperlane-xyz/hyperlane-monorepo/blob/main/typescript/sdk/src/metadata/chainMetadataTypes.ts
export const chains: ChainMap<ChainMetadata & { mailbox?: Address }> = {
  // All chain definitions are now in chains.yaml
};

// rent account payment for (mostly for) SVM chains added on top of IGP,
// not exact but should be pretty close to actual payment
export const chainsRentEstimate: ChainMap<bigint> = {
  // No SVM chains in use, keeping empty
};
