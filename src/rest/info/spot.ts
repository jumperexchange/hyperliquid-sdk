import { SpotMeta, SpotClearinghouseState, SpotMetaAndAssetCtxs, TokenDetails } from '../../types';
import { HttpApi } from '../../utils/helpers';
import { InfoType } from '../../types/constants';
import { SymbolConversion } from '../../utils/symbolConversion';

export class SpotInfoAPI {
  private httpApi: HttpApi;
  private symbolConversion: SymbolConversion;

  constructor(httpApi: HttpApi, symbolConversion: SymbolConversion) {
    this.httpApi = httpApi;
    this.symbolConversion = symbolConversion;
  }

  async getSpotMeta(rawResponse: boolean = false): Promise<SpotMeta> {
    const response = await this.httpApi.makeRequest({ type: InfoType.SPOT_META });
    return rawResponse
      ? (response as SpotMeta)
      : ((await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'SPOT'
        )) as SpotMeta);
  }

  async getSpotClearinghouseState(
    user: string,
    rawResponse: boolean = false
  ): Promise<SpotClearinghouseState> {
    const response = await this.httpApi.makeRequest({
      type: InfoType.SPOT_CLEARINGHOUSE_STATE,
      user: user,
    });
    return rawResponse
      ? (response as SpotClearinghouseState)
      : ((await this.symbolConversion.convertResponse(
          response,
          ['name', 'coin', 'symbol'],
          'SPOT'
        )) as SpotClearinghouseState);
  }

  async getSpotMetaAndAssetCtxs(rawResponse: boolean = false): Promise<SpotMetaAndAssetCtxs> {
    const response = await this.httpApi.makeRequest({ type: InfoType.SPOT_META_AND_ASSET_CTXS });
    return rawResponse
      ? (response as SpotMetaAndAssetCtxs)
      : ((await this.symbolConversion.convertResponse(response)) as SpotMetaAndAssetCtxs);
  }

  async getTokenDetails(tokenId: string, rawResponse: boolean = false): Promise<any> {
    const response = await this.httpApi.makeRequest(
      {
        type: InfoType.TOKEN_DETAILS,
        tokenId: tokenId,
      },
      20
    );

    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }

  async getSpotDeployState(user: string, rawResponse: boolean = false): Promise<any> {
    const response = await this.httpApi.makeRequest(
      {
        type: InfoType.SPOT_DEPLOY_STATE,
        user: user,
      },
      20
    );

    return rawResponse ? response : await this.symbolConversion.convertResponse(response);
  }

  /// In order to conform to https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/tick-and-lot-size

  // Sizes are rounded to the szDecimals of that asset. For example, if szDecimals = 3 then 1.001 is a valid size but 1.0001 is not.
  // szDecimals for an asset is found in the meta response to the info endpoint
  formatSize(details: TokenDetails, size: number): number {
    const multiplier = Math.pow(10, details.szDecimals);
    return Math.floor(size * multiplier) / multiplier;
  }

  // Prices can have up to 5 significant figures, but no more than MAX_DECIMALS - szDecimals decimal places where MAX_DECIMALS is 6 for perps and 8 for spot.
  //  Integer prices are always allowed, regardless of the number of significant figures. E.g. 123456 is a valid price even though 12345.6 is not.
  // Functions only for spot
  formatPrice(details: TokenDetails, price: number): number {
    const maxDecimals = 8; 
    const maxDecimalPlaces = maxDecimals - details.szDecimals;

    const maxSignificantFigures = 5;
    const priceMagnitude = Math.floor(Math.log10(Math.abs(price))) + 1;
    const maxSignificantFigureDecimalPlaces = maxSignificantFigures - priceMagnitude;

    const decimals = Math.min(maxSignificantFigureDecimalPlaces, maxDecimalPlaces);
    const effectiveDecimals = Math.max(0, decimals);

    const multiplier = Math.pow(10, effectiveDecimals);
    return Math.round(price * multiplier) / multiplier;
  }
}
