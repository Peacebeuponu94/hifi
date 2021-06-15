// SPDX-License-Identifier: LGPL-3.0-or-later
pragma solidity >=0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@paulrberg/contracts/token/erc20/IErc20.sol";

import "./IFintrollerV1.sol";
import "./SFintrollerV1.sol";
import "../hToken/IHToken.sol";
import "../../access/OwnableUpgradeable.sol";

/// @notice FintrollerV1
/// @author Hifi
/// @dev Due to the upgradeability pattern, we have to inherit from the storage contract last.
contract FintrollerV1 is
    Initializable, // no dependency
    OwnableUpgradeable, // two dependencies
    IFintrollerV1, // one dependency
    SFintrollerV1 // no dependency
{
    /// INITIALIZER ///

    /// @notice The upgradeability variant of the contract constructor.
    function initialize() public initializer {
        // Initialize the owner.
        OwnableUpgradeable.__OwnableUpgradeable__init();

        // Set the max bonds limit.
        maxBonds = DEFAULT_MAX_BONDS;
    }

    /// PUBLIC CONSTANT FUNCTIONS ///

    /// @inheritdoc IFintrollerV1
    function getBond(IHToken hToken) external view override returns (Bond memory) {
        return bonds[hToken];
    }

    /// @inheritdoc IFintrollerV1
    function getBorrowAllowed(IHToken bond) external view override returns (bool) {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        return bonds[bond].isBorrowAllowed;
    }

    /// @inheritdoc IFintrollerV1
    function getCollateral(IErc20 collateral) external view override returns (Collateral memory) {
        return collaterals[collateral];
    }

    /// @inheritdoc IFintrollerV1
    function getCollateralizationRatio(IErc20 collateral) external view override returns (uint256) {
        return collaterals[collateral].collateralizationRatio;
    }

    /// @inheritdoc IFintrollerV1
    function getDebtCeiling(IHToken bond) external view override returns (uint256) {
        return bonds[bond].debtCeiling;
    }

    /// @inheritdoc IFintrollerV1
    function getDepositCollateralAllowed(IErc20 collateral) external view override returns (bool) {
        require(collaterals[collateral].isListed, "COLLATERAL_NOT_LISTED");
        return collaterals[collateral].isDepositCollateralAllowed;
    }

    /// @inheritdoc IFintrollerV1
    function getLiquidationIncentive(IErc20 collateral) external view override returns (uint256) {
        return collaterals[collateral].liquidationIncentive;
    }

    /// @inheritdoc IFintrollerV1
    function getLiquidateBorrowAllowed(IHToken bond) external view override returns (bool) {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        return bonds[bond].isLiquidateBorrowAllowed;
    }

    /// @inheritdoc IFintrollerV1
    function getRepayBorrowAllowed(IHToken bond) external view override returns (bool) {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        return bonds[bond].isRepayBorrowAllowed;
    }

    /// @inheritdoc IFintrollerV1
    function isBondListed(IHToken bond) external view override returns (bool) {
        return bonds[bond].isListed;
    }

    /// @notice Checks if the collateral is listed.
    /// @param collateral The collateral to make the check against.
    /// @return bool true = listed, otherwise not.
    function isCollateralListed(IErc20 collateral) external view override returns (bool) {
        return collaterals[collateral].isListed;
    }

    /// PUBLIC NON-CONSTANT FUNCTIONS ///

    /// @inheritdoc IFintrollerV1
    function listBond(IHToken bond) external override onlyOwner {
        bonds[bond] = Bond({
            debtCeiling: 0,
            isBorrowAllowed: true,
            isLiquidateBorrowAllowed: true,
            isListed: true,
            isRedeemHTokenAllowed: true,
            isRepayBorrowAllowed: true,
            isSupplyUnderlyingAllowed: true
        });
        emit ListBond(owner, bond);
    }

    /// @inheritdoc IFintrollerV1
    function listCollateral(IErc20 collateral) external override onlyOwner {
        // Checks: decimals are between the expected bounds.
        uint256 decimals = collateral.decimals();
        require(decimals > 0, "LIST_COLLATERAL_DECIMALS_ZERO");
        require(decimals < 19, "LIST_COLLATERAL_DECIMALS_OVERFLOW");

        // Effects: update storage.
        collaterals[collateral] = Collateral({
            collateralizationRatio: DEFAULT_COLLATERALIZATION_RATIO,
            isDepositCollateralAllowed: true,
            isListed: true,
            liquidationIncentive: DEFAULT_LIQUIDATION_INCENTIVE
        });

        emit ListCollateral(owner, collateral);
    }

    /// @inheritdoc IFintrollerV1
    function setBorrowAllowed(IHToken bond, bool state) external override onlyOwner {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        bonds[bond].isBorrowAllowed = state;
        emit SetBorrowAllowed(owner, bond, state);
    }

    /// @inheritdoc IFintrollerV1
    function setCollateralizationRatio(IErc20 collateral, uint256 newCollateralizationRatio)
        external
        override
        onlyOwner
    {
        // Checks: bond is listed.
        require(collaterals[collateral].isListed, "COLLATERAL_NOT_LISTED");

        // Checks: new collateralization ratio is within the accepted bounds.
        require(
            newCollateralizationRatio <= COLLATERALIZATION_RATIO_UPPER_BOUND,
            "SET_COLLATERALIZATION_RATIO_UPPER_BOUND"
        );
        require(
            newCollateralizationRatio >= COLLATERALIZATION_RATIO_LOWER_BOUND,
            "SET_COLLATERALIZATION_RATIO_LOWER_BOUND"
        );

        // Effects: update storage.
        uint256 oldCollateralizationRatio = collaterals[collateral].collateralizationRatio;
        collaterals[collateral].collateralizationRatio = newCollateralizationRatio;

        emit SetCollateralizationRatio(owner, collateral, oldCollateralizationRatio, newCollateralizationRatio);
    }

    /// @inheritdoc IFintrollerV1
    function setDebtCeiling(IHToken bond, uint256 newDebtCeiling) external override onlyOwner {
        // Checks: bond is listed.
        require(bonds[bond].isListed, "BOND_NOT_LISTED");

        // Checks: the zero edge case.
        require(newDebtCeiling > 0, "SET_DEBT_CEILING_ZERO");

        // Checks: above total supply of hTokens.
        uint256 totalSupply = bond.totalSupply();
        require(newDebtCeiling >= totalSupply, "SET_DEBT_CEILING_UNDERFLOW");

        // Effects: update storage.
        uint256 oldDebtCeiling = bonds[bond].debtCeiling;
        bonds[bond].debtCeiling = newDebtCeiling;

        emit SetDebtCeiling(owner, bond, oldDebtCeiling, newDebtCeiling);
    }

    /// @inheritdoc IFintrollerV1
    function setDepositCollateralAllowed(IErc20 collateral, bool state) external override onlyOwner {
        require(collaterals[collateral].isListed, "COLLATERAL_NOT_LISTED");
        collaterals[collateral].isDepositCollateralAllowed = state;
        emit SetDepositCollateralAllowed(owner, collateral, state);
    }

    /// @inheritdoc IFintrollerV1
    function setLiquidateBorrowAllowed(IHToken bond, bool state) external override onlyOwner {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        bonds[bond].isLiquidateBorrowAllowed = state;
        emit SetLiquidateBorrowAllowed(owner, bond, state);
    }

    /// @inheritdoc IFintrollerV1
    function setLiquidationIncentive(IErc20 collateral, uint256 newLiquidationIncentive) external override onlyOwner {
        // Checks: bond is listed.
        require(collaterals[collateral].isListed, "COLLATERAL_NOT_LISTED");

        // Checks: new collateralization ratio is within the accepted bounds.
        require(newLiquidationIncentive <= LIQUIDATION_INCENTIVE_UPPER_BOUND, "SET_LIQUIDATION_INCENTIVE_UPPER_BOUND");
        require(newLiquidationIncentive >= LIQUIDATION_INCENTIVE_LOWER_BOUND, "SET_LIQUIDATION_INCENTIVE_LOWER_BOUND");

        // Effects: update storage.
        uint256 oldLiquidationIncentive = collaterals[collateral].liquidationIncentive;
        collaterals[collateral].liquidationIncentive = newLiquidationIncentive;

        emit SetLiquidationIncentive(owner, collateral, oldLiquidationIncentive, newLiquidationIncentive);
    }

    /// @inheritdoc IFintrollerV1
    function setMaxBonds(uint256 newMaxBonds) external override onlyOwner {
        uint256 oldMaxBonds = maxBonds;
        maxBonds = newMaxBonds;
        emit SetMaxBonds(owner, oldMaxBonds, newMaxBonds);
    }

    /// @inheritdoc IFintrollerV1
    function setRepayBorrowAllowed(IHToken bond, bool state) external override onlyOwner {
        require(bonds[bond].isListed, "BOND_NOT_LISTED");
        bonds[bond].isRepayBorrowAllowed = state;
        emit SetRepayBorrowAllowed(owner, bond, state);
    }
}
