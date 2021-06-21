import { integrationFixture } from "../../shared/fixtures";
import { shouldBehaveLikeHifiFlashSwap } from "./HifiFlashSwap.behavior";

export function integrationTestHifiFlashSwap(): void {
  describe("HifiFlashSwap", function () {
    beforeEach(async function () {
      const {
        balanceSheet,
        fintroller,
        fyToken,
        hifiFlashSwap,
        oracle,
        redemptionPool,
        usdc,
        usdcPriceFeed,
        uniswapV2Pair,
        wbtc,
        wbtcPriceFeed,
      } = await this.loadFixture(integrationFixture);
      this.contracts.balanceSheet = balanceSheet;
      this.contracts.fintroller = fintroller;
      this.contracts.fyToken = fyToken;
      this.contracts.hifiFlashSwap = hifiFlashSwap;
      this.contracts.oracle = oracle;
      this.contracts.redemptionPool = redemptionPool;
      this.contracts.usdc = usdc;
      this.contracts.usdcPriceFeed = usdcPriceFeed;
      this.contracts.uniswapV2Pair = uniswapV2Pair;
      this.contracts.wbtc = wbtc;
      this.contracts.wbtcPriceFeed = wbtcPriceFeed;
    });

    shouldBehaveLikeHifiFlashSwap();
  });
}
