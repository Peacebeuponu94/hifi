import { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { expect } from "chai";

import {
  FintrollerConstants,
  PrecisionScalarForTokenWithEightDecimals,
  TokenAmounts,
  YTokenConstants,
} from "../../../../helpers/constants";
import { FintrollerErrors, GenericErrors, RedemptionPoolErrors } from "../../../../helpers/errors";
import { contextForStubbedUnderlyingWithEightDecimals } from "../../../../helpers/mochaContexts";

export default function shouldBehaveLikeRedeemYTokens(): void {
  const underlyingAmount: BigNumber = TokenAmounts.OneHundred;
  const yTokenAmount: BigNumber = TokenAmounts.OneHundred;

  describe("when the bond did not mature", function () {
    beforeEach(async function () {
      await this.stubs.yToken.mock.expirationTime.returns(YTokenConstants.DefaultExpirationTime);
    });

    it("reverts", async function () {
      await expect(
        this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount),
      ).to.be.revertedWith(GenericErrors.BondNotMatured);
    });
  });

  describe("when the bond matured", function () {
    beforeEach(async function () {
      /* Set the expiration time to now minus one hour. */
      const nowMinusOneHour: BigNumber = BigNumber.from(Math.round(new Date().getTime() / 1000) - 3600);
      await this.stubs.yToken.mock.expirationTime.returns(nowMinusOneHour);
    });

    describe("when the amount to redeemYTokens is zero", function () {
      it("reverts", async function () {
        const zeroRedeemYTokensAmount: BigNumber = Zero;
        await expect(
          this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(zeroRedeemYTokensAmount),
        ).to.be.revertedWith(RedemptionPoolErrors.RedeemYTokensZero);
      });
    });

    describe("when the amount to redeemYTokens is not zero", function () {
      describe("when the bond is not listed", function () {
        beforeEach(async function () {
          await this.stubs.fintroller.mock.getRedeemYTokensAllowed
            .withArgs(this.stubs.yToken.address)
            .revertsWithReason(FintrollerErrors.BondNotListed);
        });

        it("reverts", async function () {
          await expect(
            this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount),
          ).to.be.revertedWith(FintrollerErrors.BondNotListed);
        });
      });

      describe("when the bond is listed", function () {
        beforeEach(async function () {
          await this.stubs.fintroller.mock.getBondCollateralizationRatio
            .withArgs(this.stubs.yToken.address)
            .returns(FintrollerConstants.DefaultBond.CollateralizationRatio);
        });

        describe("when the fintroller does not allow redeem yTokens", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.getRedeemYTokensAllowed.withArgs(this.stubs.yToken.address).returns(false);
          });

          it("reverts", async function () {
            await expect(
              this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount),
            ).to.be.revertedWith(RedemptionPoolErrors.RedeemYTokensNotAllowed);
          });
        });

        describe("when the fintroller allows redeem yTokens", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.getRedeemYTokensAllowed.withArgs(this.stubs.yToken.address).returns(true);
          });

          describe("when there is not enough liquidity", function () {
            it("reverts", async function () {
              await expect(
                this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount),
              ).to.be.revertedWith(RedemptionPoolErrors.RedeemYTokensInsufficientUnderlying);
            });
          });

          describe("when there is enough liquidity", function () {
            beforeEach(async function () {
              const totalUnderlyingSupply: BigNumber = TokenAmounts.OneMillion;
              await this.contracts.redemptionPool.__godMode_setTotalUnderlyingSupply(totalUnderlyingSupply);
            });

            describe("when the call to burn the yTokens does not succeed", function () {
              beforeEach(async function () {
                await this.stubs.yToken.mock.burn.withArgs(this.accounts.maker, underlyingAmount).returns(false);
              });

              it("reverts", async function () {
                await expect(this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount))
                  .to.be.reverted;
              });
            });

            describe("when the call to burn the yTokens succeeds", function () {
              beforeEach(async function () {
                await this.stubs.yToken.mock.burn.withArgs(this.accounts.maker, yTokenAmount).returns(true);
              });

              contextForStubbedUnderlyingWithEightDecimals("when the underlying has 6 decimals", function () {
                const downscaledUnderlyingAmount: BigNumber = underlyingAmount.div(
                  PrecisionScalarForTokenWithEightDecimals,
                );

                beforeEach(async function () {
                  await this.stubs.underlying.mock.transfer
                    .withArgs(this.accounts.maker, downscaledUnderlyingAmount)
                    .returns(true);
                });

                it("redeems the underlying", async function () {
                  const oldUnderlyingTotalSupply: BigNumber = await this.contracts.redemptionPool.totalUnderlyingSupply();
                  await this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(yTokenAmount);
                  const newUnderlyingTotalSupply: BigNumber = await this.contracts.redemptionPool.totalUnderlyingSupply();
                  expect(oldUnderlyingTotalSupply).to.equal(newUnderlyingTotalSupply.add(downscaledUnderlyingAmount));
                });
              });

              describe("when the underlying has 18 decimals", function () {
                beforeEach(async function () {
                  await this.stubs.underlying.mock.transfer
                    .withArgs(this.accounts.maker, underlyingAmount)
                    .returns(true);
                });

                it("redeems the underlying", async function () {
                  const oldUnderlyingTotalSupply: BigNumber = await this.contracts.redemptionPool.totalUnderlyingSupply();
                  await this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount);
                  const newUnderlyingTotalSupply: BigNumber = await this.contracts.redemptionPool.totalUnderlyingSupply();
                  expect(oldUnderlyingTotalSupply).to.equal(newUnderlyingTotalSupply.add(underlyingAmount));
                });

                it("emits a RedeemYTokens event", async function () {
                  await expect(
                    this.contracts.redemptionPool.connect(this.signers.maker).redeemYTokens(underlyingAmount),
                  )
                    .to.emit(this.contracts.redemptionPool, "RedeemYTokens")
                    .withArgs(this.accounts.maker, yTokenAmount, underlyingAmount);
                });
              });
            });
          });
        });
      });
    });
  });
}
