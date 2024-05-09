export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  id: string;
  accountId: string;
  puuid: string;
  name: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export type Role = "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";

/**
 * key is friend:friend:friend:friend:friend where friend is summoner name and is sorted alphabetically
 */
export interface Player5StackStatistics {
  [key: string]: Record<string, PlayerRoleAndAggregateStatistics>;
}

export type PlayerRoleAndAggregateStatistics = PlayerRoleStatistics & {
  aggregate: PlayerStatisticsWithEnemy;
};

export type PlayerRoleStatistics = {
  [key in Role]: PlayerStatisticsWithEnemy | null;
};

export interface PlayerStatisticsWithEnemy extends PlayerStatistics {
  enemyLaner: PlayerStatistics | undefined;
}

export interface PlayerStatistics {
  numberOfGames: BooleanStatistic;
  win: BooleanStatistic;
  kda: Statistic;
  kills: Statistic;
  deaths: Statistic;
  assists: Statistic;
  visionScore: Statistic;
  totalDamageDealtToChampions: Statistic;
  firstTower: BooleanStatistic;
  firstBlood: BooleanStatistic;
  objectivesStolen: Statistic;
  goldEarned: Statistic;
  towers: Statistic;
  dragons: Statistic;
  barons: Statistic;
  riftHerald: Statistic;
  damagePerMinute: Statistic;
  earliestBaron: Statistic;
  earliestDragonTakedown: Statistic;
  epicMonsterSteals: Statistic;
  firstTurretKilled: Statistic;
  firstTurretKilledTime: Statistic;
  gameLength: Statistic;
  goldPerMinute: Statistic;
  killParticipation: Statistic;
  laneMinionsFirst10Minutes: Statistic;
  laningPhaseGoldExpAdvantage: Statistic;
  maxCsAdvantageOnLaneOpponent: Statistic;
  maxKillDeficit: Statistic;
  maxLevelLeadLaneOpponent: Statistic;
  soloKills: Statistic;
  soloTurretsLategame: Statistic;
  stealthWardsPlaced: Statistic;
  takedownOnFirstTurret: Statistic;
  takedowns: Statistic;
  takedownsFirstXMinutes: Statistic;
  teamDamagePercentage: Statistic;
  turretPlatesTaken: Statistic;
  turretTakedowns: Statistic;
  visionScoreAdvantageLaneOpponent: Statistic;
  visionScorePerMinute: Statistic;
  wardTakedowns: Statistic;
  wardTakedownsBefore20M: Statistic;
  wardsGuarded: Statistic;
}

export interface OverallPlayerStats<Value> {
  numberOfGames: Value;
  win: Value;
  kda: Value;
  kills: Value;
  deaths: Value;
  assists: Value;
  visionScore: Value;
  totalDamageDealtToChampions: Value;
  firstTower: Value;
  firstBlood: Value;
  objectivesStolen: Value;
  goldEarned: Value;
  towers: Value;
  dragons: Value;
  barons: Value;
  riftHerald: Value;
  damagePerMinute: Value;
  earliestBaron: Value;
  earliestDragonTakedown: Value;
  epicMonsterSteals: Value;
  firstTurretKilled: Value;
  firstTurretKilledTime: Value;
  gameLength: Value;
  goldPerMinute: Value;
  killParticipation: Value;
  laneMinionsFirst10Minutes: Value;
  laningPhaseGoldExpAdvantage: Value;
  maxCsAdvantageOnLaneOpponent: Value;
  maxKillDeficit: Value;
  maxLevelLeadLaneOpponent: Value;
  soloKills: Value;
  soloTurretsLategame: Value;
  stealthWardsPlaced: Value;
  takedownOnFirstTurret: Value;
  takedowns: Value;
  takedownsFirstXMinutes: Value;
  teamDamagePercentage: Value;
  turretPlatesTaken: Value;
  turretTakedowns: Value;
  visionScoreAdvantageLaneOpponent: Value;
  visionScorePerMinute: Value;
  wardTakedowns: Value;
  wardTakedownsBefore20M: Value;
  wardsGuarded: Value;
}

export interface OverallStackStatistics {
  basedOnStack: {
    playerBestPositions: {
      [key: string]: Role;
    };
    playerWorstPositions: {
      [key: string]: Role;
    };
    recommendedPositions: {
      [key in Role]: string;
    };
    recommendedPositionsWinPercent: number;
    winPercent: number;
    numberOfGames: number;
  };
  basedOnPlayers: {
    recommendedPositions: {
      [key in Role]: string;
    };
    recommendedPositionsWinPercent: number;
  };
  basedOnPlayersFiltered: {
    recommendedPositions: {
      [key in Role]: string;
    };
    recommendedPositionsWinPercent: number;
  };
}

export interface OverallPlayerStatistics {
  bestByLane: OverallPlayerStats<Role>;
  winningestStack: string[];
  winningestStackAtLeast5: string[];
  bestTeammates: Array<{
    player: string;
    winPercent: number;
    numberOfGames: number;
  }>;
  winPercentByRole: {
    [key in Role]: {
      percent: number;
      numberOfGames: number;
    };
  };
  aggregateWinPercent: number;
  numberOfGames: number;
}

export interface Statistic {
  average: number;
  max: number;
  min: number;
}

export interface BooleanStatistic {
  count: number;
  percent: number;
}

export interface Match {
  metadata: {
    dataVersion: string;
    matchId: string;
    participants: string[];
  };
  info: {
    gameDuration: number; //seconds
    participants: Array<MatchParticipant>;
    platformId: "NA1";
    queueId: number;
  };
}

export interface MatchParticipant {
  assists: number;
  baronKills: number;
  champLevel: number;
  championId: number;
  championName: string;
  damageDealtToBuildings: number;
  damageDealtToObjectives: number;
  damageDealtToTurrets: number;
  damageSelfMitigated: number;
  deaths: number;
  detectorWardsPlaced: number;
  dragonKills: number;
  firstBloodAssist: boolean;
  firstBloodKill: boolean;
  firstTowerAssist: boolean;
  firstTowerKill: boolean;
  goldEarned: number;
  goldSpent: number;
  inhibitorKills: number;
  inhibitorTakedowns: number;
  inhibitorsLost: number;
  kills: number;
  largestKillingSpree: number;
  largestMultiKill: number;
  longestTimeSpentLiving: number;
  magicDamageDealt: number;
  magicDamageDealtToChampions: number;
  magicDamageTaken: number;
  neutralMinionsKilled: number;
  objectivesStolen: number;
  objectivesStolenAssists: number;
  participantId: number;
  pentaKills: number;
  physicalDamageDealt: number;
  physicalDamageDealtToChampions: number;
  physicalDamageTaken: number;
  puuid: string;
  quadraKills: number;
  sightWardsBoughtInGame: number;
  summonerName: string;
  teamId: 100 | 200;
  teamPosition: Role;
  totalDamageDealt: number;
  totalDamageDealtToChampions: number;
  totalDamageShieldedOnTeammates: number;
  totalDamageTaken: number;
  totalEnemyJungleMinionsKilled: number;
  totalHeal: number;
  totalMinionsKilled: number;
  totalTimeCCDealt: number;
  totalTimeSpentDead: number;
  tripleKills: number;
  trueDamageDealt: number;
  trueDamageDealtToChampions: number;
  trueDamageTaken: number;
  turretKills: number;
  turretTakedowns: number;
  turretsLost: number;
  visionClearedPings: number;
  visionScore: number;
  visionWardsBoughtInGame: number;
  wardsKilled: number;
  wardsPlaced: number;
  win: boolean;
  challenges?: MatchParticipantChallenge;
}

export interface MatchParticipantChallenge {
  baronTakedowns: number;
  bountyGold: number;
  controlWardsPlaced: number;
  damagePerMinute: number;
  damageTakenOnTeamPercentage: number;
  dragonTakedowns: number;
  earliestBaron: number;
  earliestDragonTakedown: number;
  epicMonsterSteals: number;
  epicMonsterStolenWithoutSmite: number;
  firstTurretKilled: number;
  firstTurretKilledTime: number;
  gameLength: number;
  goldPerMinute: number;
  jungleCsBefore10Minutes: number;
  junglerTakedownsNearDamagedEpicMonster: number;
  kTurretsDestroyedBeforePlatesFall: number;
  kda: number;
  killParticipation: number;
  laneMinionsFirst10Minutes: number;
  laningPhaseGoldExpAdvantage: number;
  maxCsAdvantageOnLaneOpponent: number;
  maxKillDeficit: number;
  maxLevelLeadLaneOpponent: number;
  riftHeraldTakedowns: number;
  soloKills: number;
  soloTurretsLategame: number;
  stealthWardsPlaced: number;
  takedownOnFirstTurret: number;
  takedowns: number;
  takedownsFirstXMinutes: number;
  teamBaronKills: number;
  teamDamagePercentage: number;
  turretPlatesTaken: number;
  turretTakedowns: number;
  visionScoreAdvantageLaneOpponent: number;
  visionScorePerMinute: number;
  wardTakedowns: number;
  wardTakedownsBefore20M: number;
  wardsGuarded: number;
}
