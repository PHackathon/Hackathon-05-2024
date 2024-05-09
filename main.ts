import { readFileSync, writeFileSync } from "fs";
import friends from "./friends.json";
import alts from "./alts.json";
import query from "./stack.json";
import filterConditions from "./filter.json";
import {
  BooleanStatistic,
  Match,
  MatchParticipant,
  OverallPlayerStatistics,
  OverallPlayerStats,
  OverallStackStatistics,
  Player5StackStatistics,
  PlayerRoleAndAggregateStatistics,
  PlayerStatistics,
  PlayerStatisticsWithEnemy,
  RiotAccount,
  Role,
  Statistic,
  Summoner,
} from "./types";

const apikey = process.env.API_KEY as string;

if (!apikey) {
  throw new Error("Please provide environmeny variable API_KEY");
}

const summonerUrl = (name: string, tagLine: string = "NA1") =>
  `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tagLine}`;

const getSummonerPuuid = async (name: string) => {
  const riotId = name.split("#");
  const response = await fetch(summonerUrl(riotId[0], riotId[1]), {
    headers: {
      "X-Riot-Token": apikey,
    },
  });
  if (response.status !== 200) {
    console.error(`GET PUUID Failed due for ${name}`);
  }
  const summoner: RiotAccount = await response.json();
  return summoner;
};

// queue id = 440 RANKED_FLEX 
const matchHistoryUrl = (puuid: string) =>
  `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=440&type=ranked&start=0&count=100`;

const getMatchIds = async (puuid: string) => {
  const response = await fetch(matchHistoryUrl(puuid), {
    headers: {
      "X-Riot-Token": apikey,
    },
  });
  const matchIds: string[] = await response.json();
  return matchIds;
};

const matchUrl = (matchId: string) =>
  `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}`;

const getMatch: (
  matchId: string,
  wait?: number
) => Promise<Match | null> = async (
  matchId: string,
  wait: number = 120 / 5
) => {
  try {
    const match = readFileSync(`matches/${matchId}.json`).toString();
    return JSON.parse(match) as Match;
  } catch (e) {
    //doesn't exist
  }
  console.log(`Fetching Match with id: ${matchId}`);
  const response = await fetch(matchUrl(matchId), {
    headers: {
      "X-Riot-Token": apikey,
    },
  });

  if (response.status !== 200) {
    if (response.status === 429) {
      //rate limit wait
      //20 per 1 second, 100 per 2 minutes
      console.log(`Rate Limited. Waiting ${wait} seconds.`);
      return new Promise((res, rej) => {
        setTimeout(async () => {
          try {
            const match = await getMatch(matchId, wait + 120 / 5);
            res(match);
          } catch (e) {
            rej(e);
          }
        }, wait * 1000);
      });
    }
    console.error(`Failed to find match with id: ${matchId}`);
    writeFileSync(
      `matches/${matchId}.json`,
      JSON.stringify({ notFound: true }, undefined, 4)
    );
    return null;
  }

  const match: Match = await response.json();
  writeFileSync(`matches/${matchId}.json`, JSON.stringify(match, undefined, 4));
  return match;
};

const isMatchRankedFlexWith5Friends = (
  match: Match,
  friendPuuids: Array<string>
) => {
  return (
    match.metadata.participants.filter((puuid) => friendPuuids.includes(puuid))
      .length === 5
  );
};

function invertRecord(
  originalRecord: Record<string, string>
): Record<string, string> {
  return Object.entries(originalRecord).reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
  }, {} as Record<string, string>);
}

const getName = (name: string) => {
  const altMap = alts as Record<string, string>;
  if (altMap[name]) {
    return altMap[name];
  }
  return name;
};

const newNumberStatistic: (
  value: number | undefined
) => Statistic | undefined = (value) =>
  value
    ? {
        average: value,
        max: value,
        min: value,
      }
    : undefined;
const newBooleanStatistic: (value: boolean) => BooleanStatistic = (value) => ({
  count: 1,
  percent: value ? 1 : 0,
});

const mergeNumberStatistic: (a: Statistic, b: Statistic) => Statistic = (
  a,
  b
) =>
  a && b
    ? {
        average: (a.average + b.average) / 2,
        max: a.max > b.max ? a.max : b.max,
        min: a.min > b.min ? b.min : a.min,
      }
    : a ?? b;

const mergeBooleanStatistic: (
  a: BooleanStatistic,
  b: BooleanStatistic
) => BooleanStatistic = (a, b) =>
  a.count + b.count === 0
    ? {
        count: 0,
        percent: 0,
      }
    : {
        count: a.count + b.count,
        percent:
          (a.percent * a.count + b.percent * b.count) / (a.count + b.count),
      };

const mergePlayerStatistics: (
  a: PlayerStatistics,
  b: PlayerStatistics
) => PlayerStatistics = (a, b) => ({
  numberOfGames: mergeBooleanStatistic(a.numberOfGames, b.numberOfGames),
  assists: mergeNumberStatistic(a.assists, b.assists),
  barons: mergeNumberStatistic(a.barons, b.barons),
  damagePerMinute: mergeNumberStatistic(a.damagePerMinute, b.damagePerMinute),
  win: mergeBooleanStatistic(a.win, b.win),
  kda: mergeNumberStatistic(a.kda, b.kda),
  kills: mergeNumberStatistic(a.kills, b.kills),
  deaths: mergeNumberStatistic(a.deaths, b.deaths),
  visionScore: mergeNumberStatistic(a.visionScore, b.visionScore),
  totalDamageDealtToChampions: mergeNumberStatistic(
    a.totalDamageDealtToChampions,
    b.totalDamageDealtToChampions
  ),
  firstTower: mergeBooleanStatistic(a.firstTower, b.firstTower),
  firstBlood: mergeBooleanStatistic(a.firstBlood, b.firstBlood),
  objectivesStolen: mergeNumberStatistic(
    a.objectivesStolen,
    b.objectivesStolen
  ),
  goldEarned: mergeNumberStatistic(a.goldEarned, b.goldEarned),
  towers: mergeNumberStatistic(a.towers, b.towers),
  dragons: mergeNumberStatistic(a.dragons, b.dragons),
  riftHerald: mergeNumberStatistic(a.riftHerald, b.riftHerald),
  earliestBaron: mergeNumberStatistic(a.earliestBaron, b.earliestBaron),
  earliestDragonTakedown: mergeNumberStatistic(
    a.earliestDragonTakedown,
    b.earliestDragonTakedown
  ),
  epicMonsterSteals: mergeNumberStatistic(
    a.epicMonsterSteals,
    b.epicMonsterSteals
  ),
  firstTurretKilled: mergeNumberStatistic(
    a.firstTurretKilled,
    b.firstTurretKilled
  ),
  firstTurretKilledTime: mergeNumberStatistic(
    a.firstTurretKilledTime,
    b.firstTurretKilledTime
  ),
  gameLength: mergeNumberStatistic(a.gameLength, b.gameLength),
  goldPerMinute: mergeNumberStatistic(a.goldPerMinute, b.goldPerMinute),
  killParticipation: mergeNumberStatistic(
    a.killParticipation,
    b.killParticipation
  ),
  laneMinionsFirst10Minutes: mergeNumberStatistic(
    a.laneMinionsFirst10Minutes,
    b.laneMinionsFirst10Minutes
  ),
  laningPhaseGoldExpAdvantage: mergeNumberStatistic(
    a.laningPhaseGoldExpAdvantage,
    b.laningPhaseGoldExpAdvantage
  ),
  maxCsAdvantageOnLaneOpponent: mergeNumberStatistic(
    a.maxCsAdvantageOnLaneOpponent,
    b.maxCsAdvantageOnLaneOpponent
  ),
  maxKillDeficit: mergeNumberStatistic(a.maxKillDeficit, b.maxKillDeficit),
  maxLevelLeadLaneOpponent: mergeNumberStatistic(
    a.maxLevelLeadLaneOpponent,
    b.maxLevelLeadLaneOpponent
  ),
  soloKills: mergeNumberStatistic(a.soloKills, b.soloKills),
  soloTurretsLategame: mergeNumberStatistic(
    a.soloTurretsLategame,
    b.soloTurretsLategame
  ),
  stealthWardsPlaced: mergeNumberStatistic(
    a.stealthWardsPlaced,
    b.stealthWardsPlaced
  ),
  takedownOnFirstTurret: mergeNumberStatistic(
    a.takedownOnFirstTurret,
    b.takedownOnFirstTurret
  ),
  takedowns: mergeNumberStatistic(a.takedowns, b.takedowns),
  takedownsFirstXMinutes: mergeNumberStatistic(
    a.takedownsFirstXMinutes,
    b.takedownsFirstXMinutes
  ),
  teamDamagePercentage: mergeNumberStatistic(
    a.teamDamagePercentage,
    b.teamDamagePercentage
  ),
  turretPlatesTaken: mergeNumberStatistic(
    a.turretPlatesTaken,
    b.turretPlatesTaken
  ),
  turretTakedowns: mergeNumberStatistic(a.turretTakedowns, b.turretTakedowns),
  visionScoreAdvantageLaneOpponent: mergeNumberStatistic(
    a.visionScoreAdvantageLaneOpponent,
    b.visionScoreAdvantageLaneOpponent
  ),
  visionScorePerMinute: mergeNumberStatistic(
    a.visionScorePerMinute,
    b.visionScorePerMinute
  ),
  wardTakedowns: mergeNumberStatistic(a.wardTakedowns, b.wardTakedowns),
  wardTakedownsBefore20M: mergeNumberStatistic(
    a.wardTakedownsBefore20M,
    b.wardTakedownsBefore20M
  ),
  wardsGuarded: mergeNumberStatistic(a.wardsGuarded, b.wardsGuarded),
});

const parsePlayerStatistics: (
  player: MatchParticipant
) => Partial<PlayerStatistics> = (player: MatchParticipant) => ({
  numberOfGames: newBooleanStatistic(true),
  assists: newNumberStatistic(player.assists),
  barons: newNumberStatistic(
    player.challenges?.baronTakedowns || player.baronKills
  ),
  damagePerMinute: newNumberStatistic(player.challenges?.damagePerMinute),
  win: newBooleanStatistic(player.win),
  kda: newNumberStatistic(
    player.challenges?.kda || (player.kills + player.assists) / player.deaths
  ),
  kills: newNumberStatistic(player.kills),
  deaths: newNumberStatistic(player.deaths),
  visionScore: newNumberStatistic(player.visionScore),
  totalDamageDealtToChampions: newNumberStatistic(
    player.totalDamageDealtToChampions
  ),
  firstTower: newBooleanStatistic(
    player.firstTowerKill || player.firstTowerAssist
  ),
  firstBlood: newBooleanStatistic(
    player.firstBloodKill || player.firstBloodAssist
  ),
  objectivesStolen: newNumberStatistic(player.objectivesStolen),
  goldEarned: newNumberStatistic(player.goldEarned),
  towers: newNumberStatistic(player.turretTakedowns),
  dragons: newNumberStatistic(
    player.challenges?.dragonTakedowns || player.dragonKills
  ),
  riftHerald: newNumberStatistic(player.challenges?.riftHeraldTakedowns),
  earliestBaron: newNumberStatistic(player.challenges?.earliestBaron),
  earliestDragonTakedown: newNumberStatistic(
    player.challenges?.earliestDragonTakedown
  ),
  epicMonsterSteals: newNumberStatistic(player.challenges?.epicMonsterSteals),
  firstTurretKilled: newNumberStatistic(player.challenges?.firstTurretKilled),
  firstTurretKilledTime: newNumberStatistic(
    player.challenges?.firstTurretKilledTime
  ),
  gameLength: newNumberStatistic(player.challenges?.gameLength),
  goldPerMinute: newNumberStatistic(player.challenges?.goldPerMinute),
  killParticipation: newNumberStatistic(player.challenges?.killParticipation),
  laneMinionsFirst10Minutes: newNumberStatistic(
    player.challenges?.laneMinionsFirst10Minutes
  ),
  laningPhaseGoldExpAdvantage: newNumberStatistic(
    player.challenges?.laningPhaseGoldExpAdvantage
  ),
  maxCsAdvantageOnLaneOpponent: newNumberStatistic(
    player.challenges?.maxCsAdvantageOnLaneOpponent
  ),
  maxKillDeficit: newNumberStatistic(player.challenges?.maxKillDeficit),
  maxLevelLeadLaneOpponent: newNumberStatistic(
    player.challenges?.maxLevelLeadLaneOpponent
  ),
  soloKills: newNumberStatistic(player.challenges?.soloKills),
  soloTurretsLategame: newNumberStatistic(
    player.challenges?.soloTurretsLategame
  ),
  stealthWardsPlaced: newNumberStatistic(player.challenges?.stealthWardsPlaced),
  takedownOnFirstTurret: newNumberStatistic(
    player.challenges?.takedownOnFirstTurret
  ),
  takedowns: newNumberStatistic(player.challenges?.takedowns),
  takedownsFirstXMinutes: newNumberStatistic(
    player.challenges?.takedownsFirstXMinutes
  ),
  teamDamagePercentage: newNumberStatistic(
    player.challenges?.teamDamagePercentage
  ),
  turretPlatesTaken: newNumberStatistic(player.challenges?.turretPlatesTaken),
  turretTakedowns: newNumberStatistic(player.challenges?.turretTakedowns),
  visionScoreAdvantageLaneOpponent: newNumberStatistic(
    player.challenges?.visionScoreAdvantageLaneOpponent
  ),
  visionScorePerMinute: newNumberStatistic(
    player.challenges?.visionScorePerMinute
  ),
  wardTakedowns: newNumberStatistic(player.challenges?.wardTakedowns),
  wardTakedownsBefore20M: newNumberStatistic(
    player.challenges?.wardTakedownsBefore20M
  ),
  wardsGuarded: newNumberStatistic(player.challenges?.wardsGuarded),
});

const getEnemyLanerForPuuid: (
  match: Match,
  puuid: string
) => MatchParticipant | undefined = (match, puuid) => {
  const player = match.info.participants.find((p) => p.puuid === puuid);
  if (!player) {
    return;
  }
  const role = player.teamPosition;
  const team = player.teamId;
  return match.info.participants.find(
    (p) => p.teamPosition === role && p.teamId !== team
  );
};

const get5StackKey: (
  match: Match,
  namePuuidMap: Record<string, string>
) => string = (match, namePuuidMap) => {
  const friendPuuids = Object.values(namePuuidMap);
  const stack = match.metadata.participants.filter((puuid) =>
    friendPuuids.includes(puuid)
  );
  const puuidToName = invertRecord(namePuuidMap);
  return stack
    .map((puuid) => getName(puuidToName[puuid]))
    .sort()
    .join("-");
};

const parseMatchStatistics = (
  match: Match,
  namePuuidMap: Record<string, string>
) => {
  const friendPuuids = Object.values(namePuuidMap);
  const puuidToName = invertRecord(namePuuidMap);
  const stats: Record<string, PlayerRoleAndAggregateStatistics> =
    match.info.participants
      .filter((p) => friendPuuids.includes(p.puuid))
      .reduce((map, p) => {
        const enemy = getEnemyLanerForPuuid(match, p.puuid);
        const playerStats = {
          ...parsePlayerStatistics(p),
          enemyLaner: enemy ? parsePlayerStatistics(enemy) : undefined,
        };
        return {
          ...map,
          [getName(puuidToName[p.puuid])]: {
            aggregate: playerStats,
            [p.teamPosition]: playerStats,
          } as PlayerRoleAndAggregateStatistics,
        };
      }, {});
  return stats;
};

const mergePlayerWithEnemyStatistics: (
  a: PlayerStatisticsWithEnemy,
  b: PlayerStatisticsWithEnemy
) => PlayerStatisticsWithEnemy = (a, b) => ({
  enemyLaner:
    a.enemyLaner && b.enemyLaner
      ? mergePlayerStatistics(a.enemyLaner, b.enemyLaner)
      : a.enemyLaner ?? b.enemyLaner,
  ...mergePlayerStatistics(a, b),
});

const mergePlayerRoleAndAggregateStatistics: (
  a: PlayerRoleAndAggregateStatistics,
  b: PlayerRoleAndAggregateStatistics
) => PlayerRoleAndAggregateStatistics = (a, b) => ({
  aggregate: mergePlayerWithEnemyStatistics(a.aggregate, b.aggregate),
  BOTTOM:
    a.BOTTOM && b.BOTTOM
      ? mergePlayerWithEnemyStatistics(a.BOTTOM, b.BOTTOM)
      : a.BOTTOM ?? b.BOTTOM,
  JUNGLE:
    a.JUNGLE && b.JUNGLE
      ? mergePlayerWithEnemyStatistics(a.JUNGLE, b.JUNGLE)
      : a.JUNGLE ?? b.JUNGLE,
  MIDDLE:
    a.MIDDLE && b.MIDDLE
      ? mergePlayerWithEnemyStatistics(a.MIDDLE, b.MIDDLE)
      : a.MIDDLE ?? b.MIDDLE,
  TOP:
    a.TOP && b.TOP
      ? mergePlayerWithEnemyStatistics(a.TOP, b.TOP)
      : a.TOP ?? b.TOP,
  UTILITY:
    a.UTILITY && b.UTILITY
      ? mergePlayerWithEnemyStatistics(a.UTILITY, b.UTILITY)
      : a.UTILITY ?? b.UTILITY,
});

/**
 * is A better than B
 */
const getBetterStatistic: <S extends Statistic | BooleanStatistic>(
  a: S | undefined,
  b: S | undefined
) => boolean = (a, b) => {
  if (!a) {
    return false;
  }
  if (!b) {
    return true;
  }
  if ((a as BooleanStatistic).percent !== undefined) {
    return (a as BooleanStatistic).percent > (b as BooleanStatistic).percent;
  }
  return (a as Statistic).average > (b as Statistic).average;
};

const parseRoleByWinForPlayer = (stats: PlayerRoleAndAggregateStatistics) =>
  Object.keys(stats)
    .filter((k) => k !== "aggregate" && stats[k as Role])
    .map((k: string) => ({
      percent: stats[k as Role]?.win.percent ?? 0,
      numberOfGames: stats[k as Role]?.win.count ?? 0,
      role: k as Role,
    }));

const parseWorstPositionOfPlayer = (stats: PlayerRoleAndAggregateStatistics) =>
  parseRoleByWinForPlayer(stats).sort((a, b) => a.percent - b.percent)[0].role;

const parseBestPositionOfPlayer = (stats: PlayerRoleAndAggregateStatistics) =>
  parseRoleByWinForPlayer(stats).sort((a, b) => b.percent - a.percent)[0].role;

const getStandardError = (percent: number, count: number) =>
  Math.sqrt((percent * (1 - percent)) / count);
const getMarginOfError = (z: number, se: number) => z * se;
const getConfidenceInterval = (percent: number, moe: number) => [
  percent - moe,
  percent + moe,
];

function generateCombinations<T>(
  array2D: T[][],
  combinationSize: number,
  currentCombination: T[] = [],
  rowIndex: number = 0,
  combinations: T[][] = []
) {
  if (currentCombination.length === combinationSize) {
    combinations.push([...currentCombination]);
    return combinations;
  }

  if (rowIndex >= array2D.length) {
    return combinations;
  }

  for (
    let columnIndex = 0;
    columnIndex < array2D[rowIndex].length;
    columnIndex++
  ) {
    currentCombination.push(array2D[rowIndex][columnIndex]);
    generateCombinations(
      array2D,
      combinationSize,
      currentCombination,
      rowIndex + 1,
      combinations
    );
    currentCombination.pop();
  }

  return combinations;
}

// Main function to find the 5 players with the largest average across roles
function findRecommendedPositions(
  data: Record<
    string,
    {
      [key in Role]?: {
        percent: number;
        numberOfGames: number;
      };
    }
  >,
  prefilled: {
    [key in Role]?: string;
  } = {},
  useBest: boolean = false
): {
  result: { [key in Role]: string };
  winPercent: number;
  isFiltered: boolean;
} {
  //2d array where a row is a player and a col is a role with percent info
  const playerArray: Array<
    Array<{
      percent: number;
      numberOfGames: number;
      role: Role;
    }>
  > = Object.keys(data).reduce(
    (a, p) =>
      a.concat([
        Object.keys(data[p])
          .filter((k) => (data[p] as any)[k])
          .map((k) => ({ ...data[p][k as Role], role: k })),
      ]),
    [] as any[]
  );

  // ensure each player has an entry for each role
  playerArray.forEach((player) => {
    ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"].forEach((role) => {
      if (!player.find((v) => v.role !== (role as Role))) {
        player.push({
          numberOfGames: 0,
          percent: 0,
          role: role as Role,
        });
      }
    });
  });
  playerArray.forEach((player) => {
    player.forEach((v) => {
      v.numberOfGames = v.numberOfGames ?? 0;
      v.percent = v.percent ?? 0;
    });
  });

  const combinations = generateCombinations(playerArray, 5, [], 0, [])
    .filter(
      (arr) =>
        ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"]
          .map((role) => arr.find((v) => v.role === (role as Role)))
          .filter(Boolean).length === 5
    )
    .filter((arr) => {
      //filter out those not in prefill
      return arr.reduce((b, v, i) => {
        if (!b) {
          return false;
        }
        if (prefilled[v.role]) {
          return prefilled[v.role] === Object.keys(data)[i];
        }
        return true;
      }, true);
    });

  const filteredCombinations = combinations.filter((arr) => {
    /**
     * filter out filter.json
     */
    return arr.reduce((b, v) => {
      if (useBest) {
        return true;
      }
      if (!b) {
        return false;
      }
      if (
        !v.numberOfGames ||
        v.numberOfGames < filterConditions.minimumNumberOfGames
      ) {
        return false;
      }
      return true;
    }, true);
  });

  const isFiltered = filteredCombinations.length > 0;

  const combinationsToUse = isFiltered ? filteredCombinations : combinations;

  const winPercents = combinationsToUse.map((arr) =>
    arr.reduce(
      (percent, value) =>
        mergeBooleanStatistic(percent, {
          count: value.numberOfGames ?? 0,
          percent: value.percent ?? 0,
        }),
      {
        count: 0,
        percent: 0,
      }
    )
  );

  const highest = [...winPercents].sort((a, b) => b.percent - a.percent)[0]
    .percent;
  const index = winPercents.findIndex((p) => p.percent === highest);
  const result = combinationsToUse[index].reduce(
    (m, v, i) => ({ ...m, [v.role]: Object.keys(data)[i] }),
    {}
  ) as { [key in Role]: string };
  return {
    result: result,
    winPercent: highest,
    isFiltered: useBest ? false : isFiltered,
  };
}

const parseOverallStackStatistics: (
  stats: Player5StackStatistics,
  players: Record<string, OverallPlayerStatistics>
) => Record<string, OverallStackStatistics> = (stats, players) => {
  return Object.keys(stats).reduce((map, key) => {
    const stackStats = stats[key];
    const anyPlayer = Object.values(stackStats)[0];
    const recommendedPositions = findRecommendedPositions(
      Object.keys(stackStats).reduce(
        (a, c) => ({
          ...a,
          [c]: parseRoleByWinForPlayer(stackStats[c]).reduce(
            (r, v) => ({
              ...r,
              [v.role]: {
                percent: v.percent,
                numberOfGames: v.numberOfGames,
              },
            }),
            {}
          ),
        }),
        {}
      ),
      {},
      true
    );
    const recommendedPositionsByPlayer = findRecommendedPositions(
      Object.keys(players)
        .filter((player) => Object.keys(stackStats).includes(player))
        .reduce((a, c) => ({ ...a, [c]: players[c].winPercentByRole }), {}),
      {},
      true
    );
    const recommendedPositionsByPlayerFiltered = findRecommendedPositions(
      Object.keys(players)
        .filter((player) => Object.keys(stackStats).includes(player))
        .reduce((a, c) => ({ ...a, [c]: players[c].winPercentByRole }), {}),
      {},
      false
    );
    /**
     * Recommended = highest winning average for 5 roles
     */
    return {
      ...map,
      [key]: {
        basedOnStack: {
          numberOfGames: anyPlayer.aggregate.numberOfGames.count,
          winPercent: anyPlayer.aggregate.win.percent,
          playerBestPositions: Object.keys(stackStats).reduce(
            (a, c) => ({ ...a, [c]: parseBestPositionOfPlayer(stackStats[c]) }),
            {}
          ),
          playerWorstPositions: Object.keys(stackStats).reduce(
            (a, c) => ({
              ...a,
              [c]: parseWorstPositionOfPlayer(stackStats[c]),
            }),
            {}
          ),
          recommendedPositions: recommendedPositions.result,
          recommendedPositionsWinPercent: recommendedPositions.winPercent,
          isFiltered: recommendedPositions.isFiltered,
        },
        basedOnPlayers: {
          recommendedPositions: recommendedPositionsByPlayer.result,
          recommendedPositionsWinPercent:
            recommendedPositionsByPlayer.winPercent,
          isFiltered: recommendedPositionsByPlayer.isFiltered,
        },
        basedOnPlayersFiltered: {
          recommendedPositions: recommendedPositionsByPlayerFiltered.result,
          recommendedPositionsWinPercent:
            recommendedPositionsByPlayerFiltered.winPercent,
          isFiltered: recommendedPositionsByPlayerFiltered.isFiltered,
        },
      } as OverallStackStatistics,
    };
  }, {});
};

const parseOverallPlayerStatistics: (
  players: Record<string, PlayerRoleAndAggregateStatistics>,
  stacks: Player5StackStatistics
) => Record<string, OverallPlayerStatistics> = (players, stacks) => {
  return Object.keys(players).reduce((map, player) => {
    const stats = players[player];
    const teammatesWinPercent = Object.keys(stacks)
      .filter((k) => stacks[k][player])
      .reduce((map, k) => {
        const stack = stacks[k];
        const percent = stack[player].aggregate.win.percent;
        Object.keys(stack).forEach((key) => {
          if (!map[key]) {
            map[key] = {
              count: stack[player].aggregate.numberOfGames.count,
              percent,
            };
          } else {
            map[key] = mergeBooleanStatistic(map[key], {
              count: stack[player].aggregate.numberOfGames.count,
              percent,
            });
          }
        });
        return map;
      }, {} as Record<string, { count: number; percent: number }>);
    return {
      ...map,
      [player]: {
        bestByLane: Object.keys(stats.aggregate)
          .filter((k) => k !== "enemyLaner")
          .reduce(
            (m, s) => ({
              ...m,
              [s]: Object.keys(stats)
                .filter((k) => k !== "aggregate")
                .reduce(
                  (v, c) => {
                    const stat: any = stats[c as Role];
                    if (!stat) {
                      return v;
                    }
                    const specificStat: Statistic | BooleanStatistic = stat[s];
                    return getBetterStatistic(v.value, specificStat)
                      ? v
                      : {
                          value: specificStat,
                          role: c as Role,
                        };
                  },
                  {
                    value: undefined,
                    role: undefined,
                  } as { value?: Statistic | BooleanStatistic; role?: Role }
                ).role,
            }),
            {}
          ) as OverallPlayerStats<Role>,
        winningestStack: Object.keys(stacks)
          .filter((k) => stacks[k][player])
          .sort((a, b) => {
            const stackA = stacks[a];
            const stackB = stacks[b];
            return (
              stackB[player].aggregate.win.percent -
              stackA[player].aggregate.win.percent
            );
          })
          .slice(0, 5),
        winningestStackAtLeast5: Object.keys(stacks)
          .filter(
            (k) =>
              stacks[k][player] &&
              stacks[k][player].aggregate.numberOfGames.count >= 5
          )
          .sort((a, b) => {
            const stackA = stacks[a];
            const stackB = stacks[b];
            return (
              stackB[player].aggregate.win.percent -
              stackA[player].aggregate.win.percent
            );
          })
          .slice(0, 5),
        bestTeammates: Object.keys(teammatesWinPercent)
          .filter((k) => k !== player)
          .reduce(
            (arr, pl) =>
              arr.concat([
                {
                  player: pl,
                  winPercent: teammatesWinPercent[pl].percent,
                  numberOfGames: teammatesWinPercent[pl].count,
                },
              ]),
            [] as Array<{
              player: string;
              winPercent: number;
              numberOfGames: number;
            }>
          )
          .sort((a, b) => b.winPercent - a.winPercent),
        winPercentByRole: Object.keys(stats)
          .filter((k) => k !== "aggregate")
          .reduce(
            (m, r) => ({
              ...m,
              [r]: {
                percent: stats[r as Role]?.win.percent,
                numberOfGames: stats[r as Role]?.win.count,
              },
            }),
            {}
          ),
        aggregateWinPercent: stats.aggregate.win.percent,
        numberOfGames: stats.aggregate.numberOfGames.count,
      } as OverallPlayerStatistics,
    };
  }, {});
};

const main = async () => {
  const namePuuidMap: { [key: string]: string } = (
    await Promise.all(friends.map(getSummonerPuuid))
  ).reduce(
    (map, summoner) => ({ ...map, [`${summoner.gameName}#${summoner.tagLine}`]: summoner.puuid }),
    {}
  );
  const puuids = Object.values(namePuuidMap);

  const matchIds = [
    ...new Set(
      (await Promise.all(puuids.map(getMatchIds))).reduce(
        (a, c) => a.concat(c),
        []
      )
    ),
  ].filter((a) => typeof a === "string");
  console.log("Number of Matches", matchIds.length);
  const matches = (await Promise.all(matchIds.map(getMatch))).filter((match) =>
    match === null || (match as any).notFound === true
      ? false
      : isMatchRankedFlexWith5Friends(match, puuids)
  ) as Match[];

  const statistics = matches.reduce(
    (maps, match) => {
      const stats = parseMatchStatistics(match, namePuuidMap);
      const key = get5StackKey(match, namePuuidMap);

      if (!maps.stack[key]) {
        maps.stack[key] = stats;
      } else {
        const stackMap = maps.stack[key];
        Object.keys(stats).forEach((name) => {
          if (!stackMap[name]) {
            stackMap[name] = stats[name];
            return;
          }
          stackMap[name] = mergePlayerRoleAndAggregateStatistics(
            stackMap[name],
            stats[name]
          );
        });
      }

      Object.keys(stats).forEach((name) => {
        if (!maps.single[name]) {
          maps.single[name] = stats[name];
          return;
        }
        maps.single[name] = mergePlayerRoleAndAggregateStatistics(
          maps.single[name],
          stats[name]
        );
      });

      function generatePairs<T>(arr: T[]): [T, T][] {
        if (arr.length < 2) {
          return [];
        }
        const [first, ...rest] = arr;
        const pairsWithFirst = rest.map((item) => [first, item] as [T, T]);
        const pairsWithoutFirst = generatePairs(rest);
        return [...pairsWithFirst, ...pairsWithoutFirst];
      }

      const pairs = generatePairs(Object.keys(stats));
      pairs.forEach((pair) => {
        const playerA = stats[pair[0]];
        const playerB = stats[pair[1]];
        const duoKey = [...pair].sort().join("-");
        maps.duos[duoKey] = maps.duos[duoKey] = Object.keys(playerA).reduce(
          (m, r) => {
            Object.keys(playerB).forEach((k) => {
              const key = [`${pair[0]}-${r}`, `${pair[1]}-${k}`]
                .sort()
                .join(":");
              const currentValue = m[key];
              const newValue = playerA[r as Role]?.win;
              m[key] = currentValue
                ? newValue
                  ? mergeBooleanStatistic(currentValue, newValue)
                  : currentValue
                : playerA[r as Role]?.win;
            });
            return m;
          },
          maps.duos[duoKey] ??
            ({} as Record<string, BooleanStatistic | undefined>)
        );
      });

      return maps;
    },
    {
      stack: {} as Player5StackStatistics,
      single: {} as Record<string, PlayerRoleAndAggregateStatistics>,
      /**
       * track which two players and the roles they were playing and the win % of that combination
       *
       * key = name-name > player-role-player-role (aggregate)
       */
      duos: {} as Record<string, Record<string, BooleanStatistic | undefined>>,
    }
  );

  Object.keys(statistics.duos).forEach((duo) => {
    writeFileSync(
      `statistics/duos/${duo}.json`,
      JSON.stringify(statistics.duos[duo], undefined, 4)
    );
  });

  Object.keys(statistics.single).forEach((name) => {
    writeFileSync(
      `statistics/players/${name}.json`,
      JSON.stringify(statistics.single[name], undefined, 4)
    );
  });

  Object.keys(statistics.stack).forEach((key) => {
    writeFileSync(
      `statistics/stacks/${key}.json`,
      JSON.stringify(statistics.stack[key], undefined, 4)
    );
  });

  const overallPlayer = parseOverallPlayerStatistics(
    statistics.single,
    statistics.stack
  );
  Object.keys(overallPlayer).forEach((name) => {
    writeFileSync(
      `statistics/overall/players/${name}.json`,
      JSON.stringify(overallPlayer[name], undefined, 4)
    );
  });

  const overallStack = parseOverallStackStatistics(
    statistics.stack,
    overallPlayer
  );

  Object.keys(overallStack).forEach((key) => {
    const stats = overallStack[key];
    writeFileSync(
      `statistics/overall/stacks/${key}.json`,
      JSON.stringify(overallStack[key], undefined, 4)
    );
    if (stats.basedOnStack.numberOfGames >= 5) {
      writeFileSync(
        `statistics/overall/stacks/atLeast5/${key}.json`,
        JSON.stringify(overallStack[key], undefined, 4)
      );
    }
    if (stats.basedOnStack.numberOfGames >= 10) {
      writeFileSync(
        `statistics/overall/stacks/atLeast10/${key}.json`,
        JSON.stringify(overallStack[key], undefined, 4)
      );
    }
  });

  const queryMapped = (
    await Promise.all(query.map((q) => getSummonerPuuid(q.player)))
  ).map((v, i) => ({ position: (query[i] as any).position, name: `${v.gameName}#${v.tagLine}` }));

  const queryNames = queryMapped.map((v) => v.name);

  const queryKey = queryMapped
    .reduce((arr, summoner) => arr.concat([summoner.name]), [] as string[])
    .sort()
    .join("-");

  const overallQuery = overallStack[queryKey];

  if (!overallQuery) {
    console.log("No games found for stack query.");
  } else {
    console.log(
      `Found Stack:`,
      queryKey,
      JSON.stringify(overallStack[queryKey], undefined, 4)
    );
  }

  const recommenedWithQuery = findRecommendedPositions(
    Object.keys(overallPlayer)
      .filter((player) => queryNames.includes(player))
      .reduce((a, c) => ({ ...a, [c]: overallPlayer[c].winPercentByRole }), {}),
    queryMapped.reduce(
      (a, c) => (c.position ? { ...a, [c.position]: c.name } : a),
      {}
    ),
    false
  );

  console.log(`Query:`, queryKey, recommenedWithQuery);

  const recommenedWithoutPositionQuery = findRecommendedPositions(
    Object.keys(overallPlayer)
      .filter((player) => queryNames.includes(player))
      .reduce((a, c) => ({ ...a, [c]: overallPlayer[c].winPercentByRole }), {}),
    {},
    true
  );
  console.log(
    `Query Without constraint:`,
    queryKey,
    recommenedWithoutPositionQuery
  );

  const groupAggregateWinPercentage: BooleanStatistic = Object.keys(
    overallPlayer
  ).reduce(
    (all, player) =>
      all
        ? mergeBooleanStatistic(all, {
            count: overallPlayer[player].numberOfGames,
            percent: overallPlayer[player].aggregateWinPercent,
          })
        : {
            count: overallPlayer[player].numberOfGames,
            percent: overallPlayer[player].aggregateWinPercent,
          },
    undefined as BooleanStatistic | undefined
  ) as BooleanStatistic;

  console.log("GROUP AGGREGATE WIN %", groupAggregateWinPercentage.percent);
};

main();
