import { BigNumber } from "@ethersproject/bignumber";
import { Zero } from "@ethersproject/constants";
import { expect } from "chai";

export default function shouldBehaveLikeGetVaultDebt(): void {
  context("when the bond is not open", function () {
    it("retrieves the default value", async function () {
      const debt: BigNumber = await this.contracts.balanceSheet.getVaultDebt(
        this.stubs.hToken.address,
        this.signers.borrower.address,
      );
      expect(debt).to.equal(Zero);
    });
  });

  context("when the vault is open", function () {
    beforeEach(async function () {
      await this.stubs.fintroller.mock.isBondListed.withArgs(this.stubs.hToken.address).returns(true);
      await this.contracts.balanceSheet.connect(this.signers.borrower).openVault(this.stubs.hToken.address);
    });

    it("retrieves the default value", async function () {
      const debt: BigNumber = await this.contracts.balanceSheet.getVaultDebt(
        this.stubs.hToken.address,
        this.signers.borrower.address,
      );
      expect(debt).to.equal(Zero);
    });
  });
}
