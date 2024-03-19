import { Args, byteToBool, byteToU8, bytesToString, bytesToU16, bytesToU32, stringToBytes, u16ToBytes, u256ToBytes, u32ToBytes, u8toByte } from '@massalabs/as-types';
import { Address, Context, Storage } from '@massalabs/massa-as-sdk';
import { BIN_STEP, FLOOR_ID, FLOOR_PER_BIN, PAIR, REBALANCE_PAUSED, ROOF_ID, STATUS, TOKEN_Y, _STATUS_ENTERED, _STATUS_NOT_ENTERED } from '../storage/FloorToken';
import {BinHelper, IERC20, IFactory, IPair, Math512Bits, SafeMath256} from "@dusalabs/core"
import { u256 } from 'as-bignum/assembly/integer/u256';

class Tuple<T, U> {
    constructor(public readonly _0: T, public readonly _1: U) {}
    
}

export * from "@massalabs/sc-standards/assembly/contracts/utils/ownership"

/**
 * @title Floor Token
 * @author Trader Joe
 * @notice The Floor Token contract is made to be inherited by an ERC20-compatible contract.
 * It allows to create a floor for the token, which guarantees that the price of the token will never go below
 * the floor price. On every transfer, the floor will be rebalanced if needed, that is if the amount of token Y
 * available in the pair contract allows to raise the floor by at least one bin.
 * WARNING: The floor mechanism only works if the tokens that are minted are only minted and added as liquidity
 * to the pair contract. If the tokens are minted and sent to an account, the floor mechanism will not work.
 * The order of the tokens should never be changed.
 */


// CONSTRUCTOR

/**
     * @notice Constructor that initializes the contracts' parameters.
     * @dev The constructor will also deploy a new LB pair contract.
     * @param tokenY_ The address of the token that will be paired with the floor token.
     * @param lbFactory_ The address of the LB factory, only work with v2.1.
     * @param activeId_ The id of the active bin, this is the price floor, calculated as:
     * `(1 + binStep / 10000) ^ (activeId - 2^23)`
     * @param binStep_ The step between each bin, in basis points.
     * @param floorPerBin_ The amount of floor token that will be minted to the pair contract for each bin.
     */
export function constructor(binaryArgs: StaticArray<u8>): void {
  assert(Context.isDeployingContract(), 'already initialized');

  const args = new Args(binaryArgs);

  const tokenY = ((args.nextString().expect("tokenY is missing or invalid")))
    const lbFactory = new IFactory(new Address(args.nextString().expect("lbFactory is missing or invalid")))
    const activeId = args.nextU32().expect("activeId is missing or invalid")
    const binStep = args.nextU16().expect("binStep is missing or invalid")
    const floorPerBin = args.nextU256().expect("floorPerBin is missing or invalid")
 
 
    Storage.set(BIN_STEP, u16ToBytes(binStep))
    Storage.set(FLOOR_PER_BIN, u256ToBytes(floorPerBin))
    Storage.set(TOKEN_Y, stringToBytes(tokenY))
    
    // Create the pair contract at `activeId - 1` to make sure no one can add `tokenY` to the floor or above
    const pair = lbFactory.createLBPair((Context.callee()), new Address( tokenY), activeId - 1, binStep, 0);
    Storage.set(PAIR, stringToBytes(pair.toString()))

    Storage.set(FLOOR_ID, u32ToBytes(activeId))
    setStatus(_STATUS_NOT_ENTERED);
}

// SETTERS

function setStatus(status: u8): void {
  Storage.set(STATUS, u8toByte(status));
} 

// GETTERS

function pair(): IPair {
  return new IPair(new Address(Storage.get(bytesToString( PAIR))))
}

function status(): u8 {
  return byteToU8(Storage.get(STATUS))

}

function binStep(): u16 {
  return bytesToU16(Storage.get(BIN_STEP))
}

function floorId(): u32 {
    return bytesToU32(Storage.get(FLOOR_ID))
    }

    function roofId(): u32 {
        return bytesToU32(Storage.get(ROOF_ID))
    }

    function rebalancePaused(): bool {
        return byteToBool(Storage.get(REBALANCE_PAUSED))
    }

    /**
     * @notice Returns the range of the position, the floor and the roof bin ids.
     * @return The floor bin id.
     * @return The roof bin id.
     */
    function range(): Tuple<u32, u32> {
        return new Tuple(floorId(),roofId());
    }

    function activeId(): u32 {
        return pair().getPairInformation().activeId
    }

    

    

// MODIFIERS

    /**
     * @notice Modifier to make sure that the function is not reentrant.
     */
    function nonReentrantBefore() {
        assert(status() == _STATUS_NOT_ENTERED, "FloorToken: reentrant call");
        setStatus( _STATUS_ENTERED);
    }


    /**
     * @notice Modifier to make sure that the function is not reentrant.
     */
    function nonReentrantAfter() {
        setStatus(_STATUS_NOT_ENTERED);
    }

    // ENDPOINTS


    /**
     * @notice Returns the price floor of the token, in 128.128 fixed point format.
     * @return The price floor of the token, in 128.128 fixed point format.
     */
    function floorPrice() : u256 {
        const floorId = range()._0
        return BinHelper.getPriceFromId(floorId, binStep());
    }

    

    /**
     * @notice Returns the amount of tokens that are paired in the pair contract as locked liquidity, ie. owned
     * by this contract.
     * @return amountFloor The amount of floor token that are paired in the pair contract as locked liquidity.
     * @return amountY The amount of tokenY that are paired in the pair contract as locked liquidity.
     */
    function tokensInPair(): Tuple<u256, u256> {
        const r = range()
        const floorId =r._0
        const roofId = r._1
        return (amountFloor, amountY,,) = _getAmountsInPair(floorId, pair().getActiveId(), roofId);
    }

    /**
     * @notice Returns the new floor id if the floor was to be rebalanced.
     * @dev If the new floor id is the same as the current floor id, it means that no rebalance is needed.
     * @return The new floor id if the floor was to be rebalanced.
     */
    function calculateNewFloorId(): u32 {
        (uint24 floorId, uint24 roofId) = range();

        (uint256 totalFloorInPair, uint256 totalTokenYInPair,, uint256[] memory tokenYReserves) =
            _getAmountsInPair(floorId, activeId(), roofId);

        uint256 floorInCirculation = totalSupply() - totalFloorInPair;

        return _calculateNewFloorId(floorId, activeId(), roofId, floorInCirculation, totalTokenYInPair, tokenYReserves);
    }

    /**
     * @notice Force the floor to be rebalanced, in case it wasn't done automatically.
     * @dev This function can be called by anyone, but only if the rebalance is not paused and if the floor
     * needs to be rebalanced.
     * The nonReentrant check is done in `_safeRebalance`.
     */
    function rebalanceFloor() public virtual override {
        require(!rebalancePaused(), "FloorToken: rebalance paused");
        require(_rebalanceFloor(), "FloorToken: no rebalance needed");
    }

    /**
     * @notice Raises the roof by `nbBins` bins. New tokens will be minted to the pair contract and directly
     * added to new bins that weren't previously in the range. This will not decrease the floor price as the
     * tokens are minted are directly added to the pair contract, so the circulating supply is not increased.
     * @dev The new roof will be `roofId + nbBins`, if the roof wasn't already raised, the new roof will be
     * `floorId + nbBins - 1`. Only callable by the owner.
     * This functions should not be called too often as it will increase the gas cost of the transfers, and
     * might even make the transfers if the transaction runs out of gas. It is recommended to only call this
     * function when the active bin is close to the roof bin.
     * The nonReentrant check is done in `_raiseRoof`.
     * @param nbBins The number of bins to raise the floor by.
     */
    function raiseRoof(uint24 nbBins) public virtual override onlyOwner {
        (uint24 floorId, uint24 roofId) = range();
        _raiseRoof(roofId, floorId, nbBins);
    }

    /**
     * @notice Reduces the roof by `nbBins` bins. The tokens that are removed from the roof will be burned.
     * This will not decrease the floor price as the tokens are burned, so the circulating supply doesn't
     * change. Only callable by the owner.
     * @dev The new roof will be `roofId - nbBins`, up to the active bin, unless the floor is above it.
     * This function should be called when the roof is too high compared to the active bin, as it will
     * reduce the gas cost of the transfers.
     * @param nbBins The number of bins to reduce the roof by.
     */
    function reduceRoof(uint24 nbBins) public virtual override onlyOwner {
        (uint24 floorId, uint24 roofId) = range();
        _reduceRoof(roofId, floorId, nbBins);
    }

    /**
     * @notice Pauses the rebalance of the floor.
     * @dev Only callable by the owner.
     */
    function pauseRebalance() public virtual override onlyOwner {
        require(!rebalancePaused(), "FloorToken: rebalance already paused");

        _rebalancePaused = true;

        emit RebalancePaused();
    }

    /**
     * @notice Unpauses the rebalance of the floor.
     * @dev Only callable by the owner when the active bin is below the roof bin.
     */
    function unpauseRebalance() public virtual override onlyOwner {
        require(rebalancePaused(), "FloorToken: rebalance already unpaused");

        (, uint24 roofId) = range();
        require(roofId == 0 || pair.getActiveId() <= roofId, "FloorToken: active bin above roof");

        _rebalancePaused = false;

        emit RebalanceUnpaused();
    }

    class GetAmountsInPairResult {
        constructor(
            public readonly totalFloorInPair: u256,
            public readonly totalTokenYInPair: u256,
            public readonly sharesLeftSide: u256[],
            public readonly reservesY: u256[]
        ) {}
    }

    /**
     * @dev Returns the amount of token and tokenY that are in the pair contract.
     * @param floorId The id of the floor bin.
     * @param activeId The id of the active bin.
     * @param roofId The id of the roof bin.
     * @return totalFloorInPair The amount of tokens that are owned by this contract as liquidity.
     * @return totalTokenYInPair The amount of tokenY that are owned by this contract as liquidity.
     * @return sharesLeftSide The amount of shares owned by this contract as liquidity from floor to active bin.
     * @return reservesY The amount of tokenY owned by this contract as liquidity.
     */
    function _getAmountsInPair( floorId: u32, activeId: u32,  roofId: u32)
        :  GetAmountsInPairResult
    {
        let totalFloorInPair = u256.Zero;
        let totalTokenYInPair = u256.Zero;

        // Calculate the total number of bins and the number of bins on the left side (from floor to active bin).
        const nbBins = roofId - floorId + 1;
        const nbBinsLeftSide = floorId > activeId ? 0 : activeId - floorId + 1;

        const sharesLeftSide = new Array<u256>(nbBinsLeftSide).fill(u256.Zero);
        const reservesY = new Array<u256>(nbBins).fill(u256.Zero);

        for (let i = 0; i < nbBins; i++) {
            const id = floorId + i;

            // Get the amount of shares owned by this contract, the reserves and the total supply of each bin
            const share = pair().balanceOf(Context.callee(), id);
            const binReserves = pair().getBin((id));
            const totalShares = pair().totalSupply(id);

            // The check for totalShares is implicit, as `totalShares >= share`
            if (share > u256.Zero) {
                // Calculate the amounts of tokens owned by this contract and that were added as liquidity
                const reserveX = binReserves.reserveX > u256.Zero ?  Math512Bits.mulDivRoundDown(share, binReserves.reserveX, totalShares) : u256.Zero;
                const reserveY = binReserves.reserveY > u256.Zero ? Math512Bits.mulDivRoundDown(share, binReserves.reserveY, totalShares) : u256.Zero;

                // Update the total amounts
                totalFloorInPair = SafeMath256.add(totalFloorInPair, reserveX);
                totalTokenYInPair = SafeMath256.add(totalTokenYInPair, reserveY);

                // Update the arrays for the left side
                if (id <= activeId) {
                    sharesLeftSide[i] = share;
                    reservesY[i] = reserveY;
                }
            }


        }

        return new GetAmountsInPairResult(totalFloorInPair, totalTokenYInPair, sharesLeftSide, reservesY);
    }

    /**
     * @dev Calculates the new floor id based on the amount of floor tokens in circulation and the amount of tokenY
     * available in the pair contract.
     * @param floorId The id of the floor bin.
     * @param activeId The id of the active bin.
     * @param roofId The id of the roof bin.
     * @param floorInCirculation The amount of floor tokens in circulation.
     * @param tokenYAvailable The amount of tokenY available in the pair contract.
     * @param tokenYReserves The amount of tokenY owned by this contract as liquidity.
     * @return newFloorId The new floor id.
     */
    function _calculateNewFloorId(
        uint24 floorId,
        uint24 activeId,
        uint24 roofId,
        uint256 floorInCirculation,
        uint256 tokenYAvailable,
        uint256[] memory tokenYReserves
    ) : u32{
        if (floorId >= activeId) return floorId;

        // Iterate over all the ids from the active bin to the floor bin, in reverse order. The floor id can't be
        // greater than the roof id, so we use the smallest of activeId and roofId as the upper bound.
        uint256 id = (activeId > roofId ? roofId : activeId) + 1;
        while (id > floorId) {
            // Decrease the id prior to the calculation to avoid having to subtract 1 from the id in the calculations
            unchecked {
                --id;
            }

            // Calculate the price of the bin and get the tokenY reserve
            uint256 price = uint24(id).getPriceFromId(binStep);
            uint256 tokenYReserve = tokenYReserves[id - floorId];

            // Calculate the amount of tokenY needed to buy all the floor token in circulation
            uint256 tokenYNeeded = floorInCirculation.mulShiftRoundUp(price, Constants.SCALE_OFFSET);

            if (tokenYNeeded > tokenYAvailable) {
                // If the amount of tokenY needed is greater than the amount of tokenY available, we need to
                // keep iterating over the bins
                tokenYAvailable -= tokenYReserve;
                floorInCirculation -= tokenYReserve.shiftDivRoundDown(Constants.SCALE_OFFSET, price);
            } else {
                // If the amount of tokenY needed is lower than the amount of tokenY available, we found the
                // new floor id and we can stop iterating
                break;
            }
        }

        // Make sure that the active id is strictly greater than the new floor id.
        // If it is, force it to be the active id minus 1 to make sure we never pay the composition fee as then
        // the constraint on the distribution of the tokenY reserves might be broken. `activeId - 1` is at least
        // equal or greater than `floorId` as the first check ensures that `activeId > floorId`
        return activeId > id ? uint24(id) : activeId - 1;
    }

    /**
     * @dev Rebalances the floor by removing the bins that are not needed anymore and adding their tokenY
     * reserves to the new floor bin.
     * @return Whether the floor was rebalanced or not.
     */
    function _rebalanceFloor(): (bool) {
        (uint24 floorId, uint24 roofId) = range();

        // If the floor is already at the active bin minus one or above, no rebalance is needed.
        // We do `floorId + 1` because if the `activeId = floorId + 1`, the rebalance is not doable because
        // of the composition fee, so in order to raise the floor, the activeId has to be at least equal
        // or greater than `floorId + 2`
        if (uint256(floorId) + 1 >= activeId()) return false;

        // Get the amounts of tokens and tokenY that are in the pair contract, as well as the shares and
        // tokenY reserves owned for each bin
        const r
        = _getAmountsInPair(floorId, activeId(), roofId);

        // Calculate the amount of tokens in circulation, which is the total supply minus the tokens that are
        // in the pair.
        uint256 floorInCirculation = totalSupply() - totalFloorInPair;

        // Calculate the new floor id
        uint256 newFloorId =
            _calculateNewFloorId(floorId, activeId, roofId, floorInCirculation, totalTokenYInPair, tokenYReserves);

        // If the new floor id is the same as the current floor id, no rebalance is needed
        if (newFloorId <= floorId) return false;

        // Calculate the number of bins to remove
        uint256 nbBins = newFloorId - floorId;

        // Get the ids of the bins to remove
        uint256[] memory ids = new uint256[](nbBins);
        uint256 j;
        for (uint256 i; i < nbBins;) {
            uint256 amountY = tokenYReserves[i];

            if (amountY > 0) {
                ids[j] = floorId + i;
                shares[j] = shares[i];

                unchecked {
                    ++j;
                }
            }

            unchecked {
                ++i;
            }
        }

        // Reduce the length of the shares array to only keep the shares of the bins that will be removed. We already
        // checked that the new floor id is greater than the current floor id, so we know that the length of the shares
        // array is greater than the number of bins to remove, so this is safe to do
        assembly {
            mstore(ids, j)
            mstore(shares, j)
        }

        // Update the floor id
        _floorId = uint24(newFloorId);

        if (j > 0) _safeRebalance(ids, shares, uint24(newFloorId));

        emit FloorRaised(newFloorId);

        return true;
    }

    /**
     * @dev Helper function to rebalance the floor while making sure to not steal any tokens that was sent
     * by users prior to the rebalance, for example during a swap or a liquidity addition.
     * Note: This functions **only** works if the tokenX is this contract and the tokenY is the `tokenY`.
     * @param ids The ids of the bins to burn.
     * @param shares The shares to burn.
     * @param newFloorId The new floor id.
     */
    function _safeRebalance(uint256[] memory ids, uint256[] memory shares, uint24 newFloorId)
        internal
        virtual
        nonReentrant
    {
        // Get the previous reserves of the pair contract
        (uint256 reserveFloorBefore, uint256 reserveTokenYBefore) = pair.getReserves();

        // Burns the shares and send the tokenY to the pair as we will add all the tokenY to the new floor bin
        pair.burn(address(this), address(pair), ids, shares);

        // Get the current tokenY balance of the pair contract (minus the protocol fees)
        (, uint256 tokenYProtocolFees) = pair.getProtocolFees();
        uint256 tokenYBalanceSubProtocolFees = tokenY.balanceOf(address(pair)) - tokenYProtocolFees;

        // Get the new reserves of the pair contract
        (uint256 reserveFloorAfter, uint256 reserveTokenYAfter) = pair.getReserves();

        // Make sure we don't burn any bins greater or equal to the active bin, as this might send some unexpected
        // tokens to the pair contract
        require(reserveFloorAfter == reserveFloorBefore, "FloorToken: token reserve changed");

        // Calculate the delta amounts to get the ratio
        uint256 deltaReserveTokenY = reserveTokenYBefore - reserveTokenYAfter;
        uint256 deltaTokenYBalance = tokenYBalanceSubProtocolFees - reserveTokenYAfter;

        // Calculate the distrib, which is 1e18 if no tokenY was in the pair contract, and the ratio between the
        // previous tokenY balance and the current one otherwise, rounded up. This is done to make sure that the
        // rebalance doesn't steal any tokenY that was sent to the pair contract by the users. This works because
        // we only add tokenY, so any token that was sent to the pair prior to the rebalance will be sent back
        // to the pair contract after the rebalance. This can't underflow as `deltaTokenYBalance > 0`.
        uint256 distrib = deltaTokenYBalance > deltaReserveTokenY
            ? (deltaReserveTokenY * Constants.PRECISION + (deltaTokenYBalance - 1)) / deltaTokenYBalance
            : Constants.PRECISION;

        // Encode the liquidity parameters for the new floor bin
        bytes32[] memory liquidityParameters = new bytes32[](1);
        liquidityParameters[0] = LiquidityConfigurations.encodeParams(0, uint64(distrib), newFloorId);

        // Mint the liquidity to the pair contract, any left over will be sent back to the pair contract as
        // this would be user funds (this contains the tokenY or the tokens that were sent to the pair contract
        // prior to the rebalance)
        (bytes32 amountsReceived, bytes32 amountsLeft,) = pair.mint(address(this), liquidityParameters, address(pair));

        bytes32 amountsAdded = amountsReceived.sub(amountsLeft);
        uint256 tokenYAmount = amountsAdded.decodeY();
        require(
            tokenYAmount == deltaTokenYBalance * distrib / Constants.PRECISION && tokenYAmount >= deltaReserveTokenY
                && amountsAdded.decodeX() == 0,
            "FloorToken: broken invariant"
        );
    }

    /**
     * @dev Raises the roof by `nbBins` bins. New tokens will be minted to the pair contract and directly
     * added to new bins that weren't previously in the range.
     * This will revert if the current active bin is above the current roof id.
     * @param roofId The id of the roof bin.
     * @param floorId The id of the floor bin.
     * @param nbBins The number of bins to raise the roof by.
     */
    function _raiseRoof(uint24 roofId, uint24 floorId, uint24 nbBins) internal virtual nonReentrant {
        require(nbBins > 0, "FloorToken: zero bins");
        require(roofId == 0 || pair.getActiveId() <= roofId, "FloorToken: active bin above roof");

        // Calculate the next id, if the roof wasn't already raised, the next id will be `floorId`
        uint256 nextId = roofId == 0 ? floorId : roofId + 1;

        // Calculate the new roof id
        uint256 newRoofId = nextId + nbBins - 1;
        require(newRoofId <= type(uint24).max, "FloorToken: new roof too high");

        // Calculate the amount of tokens to mint and the share per bin
        uint64 sharePerBin = uint64(Constants.PRECISION) / nbBins;
        uint256 floorAmount = floorPerBin * nbBins;

        // Encode the liquidity parameters for each bin
        bytes32[] memory liquidityParameters = new bytes32[](nbBins);
        for (uint256 i; i < nbBins;) {
            liquidityParameters[i] = LiquidityConfigurations.encodeParams(sharePerBin, 0, uint24(nextId + i));

            unchecked {
                ++i;
            }
        }

        // Get the current reserves of the pair contract
        (uint256 floorReserve,) = pair.getReserves();
        (uint256 floorProtocolFees,) = pair.getProtocolFees();

        // Calculate the amount of tokens that are owned by the pair contract as liquidity
        uint256 floorBalanceSubProtocolFees = balanceOf(address(pair)) - floorProtocolFees;

        // Calculate the amount of tokens that were sent to the pair contract waiting to be added as liquidity or
        // swapped for tokenY.
        uint256 previousBalance = floorBalanceSubProtocolFees - floorReserve;

        // Mint or burn the tokens to make sure that the amount of tokens that will be added as liquidity is
        // exactly `floorAmount`.
        unchecked {
            if (previousBalance > floorAmount) _burn(address(pair), previousBalance - floorAmount);
            else if (floorAmount > previousBalance) _mint(address(pair), floorAmount - previousBalance);
        }

        // Mint the tokens to the pair contract and mint the liquidity
        (bytes32 amountsReceived, bytes32 amountsLeft,) = pair.mint(address(this), liquidityParameters, address(pair));

        // Make sure that no tokens Y were added as liquidity as this would mean stealing user funds.
        require(amountsReceived.sub(amountsLeft).decodeY() == 0, "FloorToken: invalid amounts");

        // Make sure that the amount of tokens X that were added as liquidity is exactly `tokenAmount`
        uint256 floorInExcess;
        if (amountsLeft.decodeX() > 0) {
            (uint256 floorReserveAfter,) = pair.getReserves();
            (uint256 floorProtocolFeesAfter,) = pair.getProtocolFees();

            // Calculate the amount of tokens that are left from the deposit
            floorInExcess = balanceOf(address(pair)) - (floorReserveAfter + floorProtocolFeesAfter);
        }

        // Mint or burn the token to make sure that the amount of token in excess is exactly `previousBalance`
        unchecked {
            if (floorInExcess > previousBalance) _burn(address(pair), floorInExcess - previousBalance);
            else if (previousBalance > floorInExcess) _mint(address(pair), previousBalance - floorInExcess);
        }

        // Update the roof id
        _roofId = uint24(newRoofId);

        emit RoofRaised(newRoofId);
    }

    /**
     * @dev Reduces the roof by `nbBins` bins. The tokens that are removed from the roof will be burned.
     * @param roofId The id of the roof bin.
     * @param floorId The id of the floor bin.
     * @param nbBins The number of bins to reduce the roof by.
     */
    function _reduceRoof(uint24 roofId, uint24 floorId, uint24 nbBins) internal virtual nonReentrant {
        require(nbBins > 0, "FloorToken: zero bins");
        require(roofId > nbBins, "FloorToken: roof too low");

        uint24 activeId = pair.getActiveId();
        uint24 newRoofId = roofId - nbBins;

        require(newRoofId > activeId, "FloorToken: new roof not above active bin");
        require(newRoofId >= floorId, "FloorToken: new roof below floor bin");

        // Calculate the ids of the bins to remove
        uint256[] memory ids = new uint256[](nbBins);
        uint256[] memory shares = new uint256[](nbBins);
        for (uint256 i; i < nbBins;) {
            uint256 id = roofId - i;

            ids[i] = id;
            shares[i] = pair.balanceOf(address(this), id);

            unchecked {
                ++i;
            }
        }

        // Get the actual balance of floor that was transferred to the pair contract
        (uint256 floorReserve, uint256 tokenYReserve) = pair.getReserves();
        (uint256 floorProtocolFees, uint256 tokenYProtocolFees) = pair.getProtocolFees();

        uint256 floorBalance = balanceOf(address(pair));

        uint256 floorExcess = floorBalance - (floorReserve + floorProtocolFees);

        // Burn the shares and send the tokenY to the pair
        pair.burn(address(this), address(pair), ids, shares);

        // Get the current tokenY balance of the pair contract (minus the protocol fees)
        (uint256 newFloorReserve, uint256 newTokenYReserve) = pair.getReserves();
        (uint256 newFloorProtocolFees, uint256 newTokenYProtocolFees) = pair.getProtocolFees();

        require(
            newTokenYReserve == tokenYReserve && newTokenYProtocolFees == tokenYProtocolFees,
            "FloorToken: tokenY reserve changed"
        );

        uint256 newFloorBalance = balanceOf(address(pair));

        require(newFloorBalance == floorBalance, "FloorToken: floor balance changed");

        uint256 newFloorExcess = newFloorBalance - (newFloorReserve + newFloorProtocolFees);

        // Burn the tokens that were removed from the pair contract
        if (newFloorExcess > floorExcess) _burn(address(pair), newFloorExcess - floorExcess);

        // Update the roof id
        _roofId = newRoofId;

        emit RoofReduced(newRoofId);
    }

    /**
     * @dev Overrides the `_beforeTokenTransfer` function to rebalance the floor if needed and when possible.
     * @param from The address of the sender.
     * @param to The address of the recipient.
     */
    function _beforeTokenTransfer(address from, address to, uint256) internal virtual {
        if (from == address(0) || to == address(0)) return;

        if (rebalancePaused()) return;

        // If the token is being transferred from the pair contract, it can't be rebalanced as the
        // reentrancy guard will prevent it. Also prevent the active bin to be above the roof bin.
        if (from == address(pair)) {
            uint24 activeId = pair.getActiveId();
            (, uint24 roofId) = range();
            require(activeId <= roofId, "FloorToken: active bin above roof");

            return;
        }

        // If the rebalance is not paused, rebalance the floor if needed
        if (_status == _STATUS_NOT_ENTERED) _rebalanceFloor();
    }
