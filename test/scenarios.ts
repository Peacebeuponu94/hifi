import { BigNumber } from "@ethersproject/bignumber";

export interface Scenario {
  collateral: {
    decimals: BigNumber;
    name: string;
    symbol: string;
  };
  fintroller: {
    collateralizationRatio: BigNumber;
  };
  guarantorPool: {
    decimals: BigNumber;
    name: string;
    symbol: string;
  };
  underlying: {
    decimals: BigNumber;
    name: string;
    symbol: string;
  };
  yToken: {
    decimals: BigNumber;
    expirationTime: BigNumber;
    name: string;
    symbol: string;
  };
}

const scenarioKeys = ["default"];
export type ScenarioKey = typeof scenarioKeys[number];

const scenarios: Record<ScenarioKey, Scenario> = {
  default: {
    collateral: {
      decimals: BigNumber.from(18),
      name: "Wrapped Ether",
      symbol: "WETH",
    },
    fintroller: {
      collateralizationRatio: BigNumber.from("1500000000000000000"),
    },
    guarantorPool: {
      decimals: BigNumber.from(18),
      name: "Mainframe Guarantor Pool Shares",
      symbol: "MGP-SHARES",
    },
    underlying: {
      decimals: BigNumber.from(18),
      name: "Dai Stablecoin",
      symbol: "DAI",
    },
    yToken: {
      decimals: BigNumber.from(18),
      expirationTime: BigNumber.from(1609459199), // December 31, 2020 at 23:59:59
      name: "DAI/ETH (2021-01-01)",
      symbol: "yDAI-JAN21",
    },
  },
};

export default scenarios;
