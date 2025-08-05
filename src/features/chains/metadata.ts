import { IRegistry } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainMetadataSchema,
  mergeChainMetadataMap,
  RpcUrlSchema,
} from '@hyperlane-xyz/sdk';
import {
  objFilter,
  objMap,
  ProtocolType,
  tryParseJsonOrYaml,
} from '@hyperlane-xyz/utils';
import { z } from 'zod';
import { chains as ChainsTS } from '../../consts/chains.ts';
import ChainsYaml from '../../consts/chains.yaml';
import { config } from '../../consts/config.ts';
import { logger } from '../../utils/logger.ts';

export async function assembleChainMetadata(
  chainsInTokens: ChainName[],
  registry: IRegistry,
  storeMetadataOverrides?: ChainMap<Partial<ChainMetadata | undefined>>,
) {
  // Chains must include a cosmos chain or CosmosKit throws errors
  const result = z.record(ChainMetadataSchema).safeParse({
    ...ChainsYaml,
    ...ChainsTS,
  });
  if (!result.success) {
    logger.warn('Invalid chain metadata', result.error);
    throw new Error(`Invalid chain metadata: ${result.error.toString()}`);
  }
  const filesystemMetadata = result.data as ChainMap<ChainMetadata>;

  let registryChainMetadata: ChainMap<ChainMetadata>;
  if (config.registryUrl) {
    logger.debug('Using custom registry chain metadata from:', config.registryUrl);
    registryChainMetadata = await registry.getMetadata();
  } else {
    logger.debug('Registry disabled - using only local chain definitions');
    registryChainMetadata = {}; // Empty registry, will only use local chains
  }

  // Filter out chains that are not in the tokens config
  registryChainMetadata = objFilter(registryChainMetadata, (c, m): m is ChainMetadata =>
    chainsInTokens.includes(c),
  );

  // Since we're not using registry, we only merge with local filesystem metadata
  const mergedChainMetadata = mergeChainMetadataMap(registryChainMetadata, filesystemMetadata);

  const parsedRpcOverridesResult = tryParseJsonOrYaml(config.rpcOverrides);
  const rpcOverrides = z
    .record(RpcUrlSchema)
    .safeParse(parsedRpcOverridesResult.success && parsedRpcOverridesResult.data);
  if (config.rpcOverrides && !rpcOverrides.success) {
    logger.warn('Invalid RPC overrides config', rpcOverrides.error);
  }

  const chainMetadata = objMap(mergedChainMetadata, (chainName, metadata) => {
    const overridesUrl =
      rpcOverrides.success && rpcOverrides.data[chainName]
        ? rpcOverrides.data[chainName]
        : undefined;

    if (!overridesUrl) return metadata;

    // Only EVM supports fallback transport, so we are putting the override at the end
    const rpcUrls =
      metadata.protocol === ProtocolType.Ethereum
        ? [...metadata.rpcUrls, overridesUrl]
        : [overridesUrl, ...metadata.rpcUrls];

    return { ...metadata, rpcUrls };
  });

  const chainMetadataWithOverrides = mergeChainMetadataMap(chainMetadata, storeMetadataOverrides);
  return { chainMetadata, chainMetadataWithOverrides };
}
