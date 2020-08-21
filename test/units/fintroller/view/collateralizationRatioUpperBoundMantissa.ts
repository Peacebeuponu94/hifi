import { BigNumber } from "@ethersproject/bignumber";
import { expect } from "chai";

import { FintrollerConstants } from "../../../helpers/constants";

export default function shouldBehaveLikeCollateralizationRatioUpperBoundMantissaGetter(): void {
  it("retrieves the collateralization ratio upper bound mantissa", async function () {
    const collateralizationRatioUpperBoundMantissa: BigNumber = await this.contracts.fintroller.collateralizationRatioUpperBoundMantissa();
    expect(collateralizationRatioUpperBoundMantissa).to.equal(
      FintrollerConstants.CollateralizationRatioUpperBoundMantissa,
    );
  });
}
