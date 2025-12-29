// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract PenaltyShootout is IEntropyConsumer {
    IEntropyV2 public entropy;

    enum ShotDirection { Left, Center, Right }

    struct GameRound {
        address player;
        ShotDirection playerMove;
        uint64 sequenceNumber;
        bool fulfilled;
        bool isGoal;
        ShotDirection goalieMove;
        uint8 windStrength;
    }

    struct PlayerStats {
        uint256 currentStreak;
        uint256 highestStreak;
        uint256 totalPoints;
        bool isOnFire;
    }

    mapping(address => PlayerStats) public playerStats;
    mapping(uint64 => GameRound) public rounds;
    
    address[] public leaderboard;
    uint256 public constant MAX_LEADERBOARD_SIZE = 10;

    event KickRequested(uint64 indexed sequenceNumber, address indexed player, ShotDirection playerMove);
    event KickFulfilled(
        uint64 indexed sequenceNumber,
        address indexed player,
        ShotDirection playerMove,
        ShotDirection actualPlayerMove,
        ShotDirection goalieMove,
        bool isGoal,
        uint256 pointsEarned,
        uint8 windStrength
    );

    constructor(address _entropyAddress) {
        entropy = IEntropyV2(_entropyAddress);
    }

    function getEntropyFee() public view returns (uint256) {
        // IEntropyV2 uses getFeeV2() for default provider fee
        return entropy.getFeeV2();
    }

    // Required by IEntropyConsumer - returns the entropy contract address
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function requestKick(uint8 playerMove) external payable {
        require(playerMove <= 2, "Invalid direction");
        
        uint256 fee = getEntropyFee();
        require(msg.value >= fee, "Insufficient fee");

        // Use requestV2 which triggers entropyCallback when randomness is ready
        uint64 sequenceNumber = entropy.requestV2{value: fee}();

        rounds[sequenceNumber] = GameRound({
            player: msg.sender,
            playerMove: ShotDirection(playerMove),
            sequenceNumber: sequenceNumber,
            fulfilled: false,
            isGoal: false,
            goalieMove: ShotDirection(0),
            windStrength: 0
        });

        emit KickRequested(sequenceNumber, msg.sender, ShotDirection(playerMove));
    }

    // This is called automatically by the Pyth Entropy keeper when randomness is ready
    function entropyCallback(
        uint64 sequenceNumber,
        address /* provider */,
        bytes32 randomNumber
    ) internal override {
        GameRound storage round = rounds[sequenceNumber];
        require(round.player != address(0), "Round does not exist");
        require(!round.fulfilled, "Already fulfilled");

        // --- Wind Mechanic ---
        uint8 windStrength = uint8(uint256(randomNumber) % 5); // 0-4
        ShotDirection actualPlayerMove = round.playerMove;

        // If wind is strong (> 3), 10% chance to deviate kick
        if (windStrength > 3) {
            uint256 deviationRoll = (uint256(randomNumber) >> 8) % 100;
            if (deviationRoll < 10) {
                // Shift direction: Left -> Center, Center -> Right, Right -> Left
                actualPlayerMove = ShotDirection((uint8(round.playerMove) + 1) % 3);
            }
        }

        // --- Goalie Move ---
        ShotDirection goalieMove = ShotDirection((uint256(randomNumber) >> 16) % 3);
        bool isGoal = actualPlayerMove != goalieMove;

        round.fulfilled = true;
        round.isGoal = isGoal;
        round.goalieMove = goalieMove;
        round.windStrength = windStrength;

        // --- Scoring Logic ---
        PlayerStats storage stats = playerStats[round.player];
        uint256 pointsEarned = 0;

        if (isGoal) {
            stats.currentStreak++;
            if (stats.currentStreak > stats.highestStreak) {
                stats.highestStreak = stats.currentStreak;
                _updateLeaderboard(round.player);
            }

            // Level-based multiplier: Rookie (1x), Pro (1.5x), Legend (2.5x)
            uint256 level = stats.currentStreak;
            uint256 basePoints = 10;
            uint256 multiplier = 100; // 1.0x in basis points

            if (level >= 7) {
                multiplier = 250; // 2.5x
            } else if (level >= 4) {
                multiplier = 150; // 1.5x
            }

            // Streak bonus
            if (stats.currentStreak >= 3) {
                stats.isOnFire = true;
                basePoints = 50; // On Fire bonus
            } else if (stats.currentStreak == 2) {
                basePoints = 25;
            }

            pointsEarned = (basePoints * multiplier) / 100;
            stats.totalPoints += pointsEarned;
        } else {
            stats.currentStreak = 0;
            stats.isOnFire = false;
        }

        emit KickFulfilled(sequenceNumber, round.player, round.playerMove, actualPlayerMove, goalieMove, isGoal, pointsEarned, windStrength);
    }

    function _updateLeaderboard(address player) internal {
        // Check if player already on leaderboard
        for (uint i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i] == player) {
                return; // Already on leaderboard
            }
        }

        // If leaderboard not full, add player
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            leaderboard.push(player);
        } else {
            // Find player with lowest highestStreak and replace if current player is better
            uint256 lowestIndex = 0;
            uint256 lowestStreak = playerStats[leaderboard[0]].highestStreak;
            
            for (uint i = 1; i < leaderboard.length; i++) {
                if (playerStats[leaderboard[i]].highestStreak < lowestStreak) {
                    lowestStreak = playerStats[leaderboard[i]].highestStreak;
                    lowestIndex = i;
                }
            }
            
            if (playerStats[player].highestStreak > lowestStreak) {
                leaderboard[lowestIndex] = player;
            }
        }
    }

    function getLeaderboard() external view returns (address[] memory) {
        return leaderboard;
    }
}
