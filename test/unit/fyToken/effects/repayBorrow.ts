import { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { expect } from "chai";

import { addressOne, fintrollerConstants, tokenAmounts } from "../../../../helpers/constants";
import { FyTokenErrors, GenericErrors } from "../../../../helpers/errors";
import { FintrollerErrors } from "../../../../helpers/errors";
import { stubIsVaultOpen } from "../../stubs";

export default function shouldBehaveLikeRepayBorrow(): void {
  const borrowAmount: BigNumber = tokenAmounts.oneHundred;
  const repayAmount: BigNumber = tokenAmounts.forty;

  describe("when the vault is not open", function () {
    beforeEach(async function () {
      await this.stubs.balanceSheet.mock.isVaultOpen
        .withArgs(this.contracts.fyToken.address, this.signers.borrower.address)
        .returns(false);
    });

    it("reverts", async function () {
      await expect(this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount)).to.be.revertedWith(
        GenericErrors.VaultNotOpen,
      );
    });
  });

  describe("when the vault is open", function () {
    beforeEach(async function () {
      await stubIsVaultOpen.call(this, this.contracts.fyToken.address, this.signers.borrower.address);
    });

    describe("when the amount to repay is zero", function () {
      it("reverts", async function () {
        await expect(this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(Zero)).to.be.revertedWith(
          FyTokenErrors.RepayBorrowZero,
        );
      });
    });

    describe("when the amount to repay is not zero", function () {
      describe("when the bond is not listed", function () {
        beforeEach(async function () {
          await this.stubs.fintroller.mock.getRepayBorrowAllowed
            .withArgs(this.contracts.fyToken.address)
            .revertsWithReason(FintrollerErrors.BondNotListed);
        });

        it("reverts", async function () {
          await expect(
            this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount),
          ).to.be.revertedWith(FintrollerErrors.BondNotListed);
        });
      });

      describe("when the bond is listed", function () {
        beforeEach(async function () {
          await this.stubs.fintroller.mock.getBondCollateralizationRatio
            .withArgs(this.contracts.fyToken.address)
            .returns(fintrollerConstants.defaultCollateralizationRatio);
        });

        describe("when the fintroller does not allow repay borrow", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.getRepayBorrowAllowed
              .withArgs(this.contracts.fyToken.address)
              .returns(false);
          });

          it("reverts", async function () {
            await expect(
              this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount),
            ).to.be.revertedWith(FyTokenErrors.RepayBorrowNotAllowed);
          });
        });

        describe("when the fintroller allows repay borrow", function () {
          beforeEach(async function () {
            await this.stubs.fintroller.mock.getRepayBorrowAllowed
              .withArgs(this.contracts.fyToken.address)
              .returns(true);
          });

          describe("when the caller does not have a debt", function () {
            beforeEach(async function () {
              await stubIsVaultOpen.call(this, this.contracts.fyToken.address, this.signers.lender.address);
              await this.stubs.balanceSheet.mock.getVaultDebt
                .withArgs(this.contracts.fyToken.address, this.signers.lender.address)
                .returns(Zero);
            });

            it("reverts", async function () {
              // Lender tries to repay his debt but fails to do it because he doesn't have any.
              await expect(
                this.contracts.fyToken.connect(this.signers.lender).repayBorrow(repayAmount),
              ).to.be.revertedWith(FyTokenErrors.RepayBorrowInsufficientDebt);
            });
          });

          describe("when the caller has a debt", function () {
            beforeEach(async function () {
              // User borrows 100 fyUSDC.
              await this.contracts.fyToken.__godMode_mint(this.signers.borrower.address, borrowAmount);
              await this.stubs.balanceSheet.mock.getVaultDebt
                .withArgs(this.contracts.fyToken.address, this.signers.borrower.address)
                .returns(repayAmount);

              // The fyToken makes an internal call to this stubbed function.
              await this.stubs.balanceSheet.mock.setVaultDebt
                .withArgs(this.contracts.fyToken.address, this.signers.borrower.address, Zero)
                .returns(true);
            });

            describe("when the caller does not have enough fyTokens", function () {
              beforeEach(async function () {
                // User burns all of his fyTokens.
                await this.contracts.fyToken.connect(this.signers.borrower).transfer(addressOne, borrowAmount);
              });

              it("reverts", async function () {
                await expect(
                  this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount),
                ).to.be.revertedWith(FyTokenErrors.RepayBorrowInsufficientBalance);
              });
            });

            describe("when the caller has enough fyTokens", function () {
              it("repays the borrowed fyTokens", async function () {
                const oldBalance: BigNumber = await this.contracts.fyToken.balanceOf(this.signers.borrower.address);
                await this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount);
                const newBalance: BigNumber = await this.contracts.fyToken.balanceOf(this.signers.borrower.address);
                expect(oldBalance).to.equal(newBalance.add(repayAmount));
              });

              it("emits a Burn event", async function () {
                await expect(this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount))
                  .to.emit(this.contracts.fyToken, "Burn")
                  .withArgs(this.signers.borrower.address, repayAmount);
              });

              it("emits a Transfer event", async function () {
                await expect(this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount))
                  .to.emit(this.contracts.fyToken, "Transfer")
                  .withArgs(this.signers.borrower.address, this.contracts.fyToken.address, repayAmount);
              });

              it("emits a RepayBorrow event", async function () {
                await expect(this.contracts.fyToken.connect(this.signers.borrower).repayBorrow(repayAmount))
                  .to.emit(this.contracts.fyToken, "RepayBorrow")
                  .withArgs(this.signers.borrower.address, this.signers.borrower.address, repayAmount, Zero);
              });
            });
          });
        });
      });
    });
  });
}
