import { AddressZero } from "@ethersproject/constants";
import { expect } from "chai";

import { AdminErrors, FintrollerErrors } from "../../../../helpers/errors";

export default function shouldBehaveLikeSetOracle(): void {
  context("when the caller is not the admin", function () {
    it("reverts", async function () {
      await expect(this.contracts.fintroller.connect(this.signers.raider).setOracle(AddressZero)).to.be.revertedWith(
        AdminErrors.NotAdmin,
      );
    });
  });

  context("when the caller is the admin", function () {
    context("when oracle address is not the zero address", function () {
      it("sets the new oracle", async function () {
        await this.contracts.fintroller.connect(this.signers.admin).setOracle(this.stubs.oracle.address);
        const oracle: string = await this.contracts.fintroller.oracle();
        expect(oracle).to.equal(this.stubs.oracle.address);
      });

      it("emits a SetOracle event", async function () {
        // The first argument is the zero address because initially there's no oracle.
        await expect(this.contracts.fintroller.connect(this.signers.admin).setOracle(this.stubs.oracle.address))
          .to.emit(this.contracts.fintroller, "SetOracle")
          .withArgs(this.signers.admin.address, AddressZero, this.stubs.oracle.address);
      });
    });

    context("when the oracle address is the zero address", function () {
      it("reverts", async function () {
        await expect(this.contracts.fintroller.connect(this.signers.admin).setOracle(AddressZero)).to.be.revertedWith(
          FintrollerErrors.SetOracleZeroAddress,
        );
      });
    });
  });
}
