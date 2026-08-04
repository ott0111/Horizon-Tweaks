import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Search, Gamepad2, CheckCircle, XCircle, RefreshCcw, HardDrive, Zap, Cpu, Monitor, Wifi, Mouse, Maximize2 } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface GameProfile {
  id: string;
  name: string;
  executable_path: string;
  icon_path?: string;
  description: string;
  platform: string;
  optimizations: {
    cpu_priority: string;
    gpu_priority: string;
    disable_fullscreen_optimizations: boolean;
    high_dpi_aware: boolean;
    disable_game_dvr: boolean;
  };
  is_active: boolean;
}

interface CuratedGame {
  id: string;
  name: string;
  platform: string;
  executable_patterns: string[];
  installed: boolean;
  executable_path: string;
  icon: string;
  description: string;
  optimizations: {
    cpu_priority: string;
    gpu_priority: string;
    disable_fullscreen_optimizations: boolean;
    high_dpi_aware: boolean;
    disable_game_dvr: boolean;
  };
  genre: string;
  tier: 'S' | 'A' | 'B';
}

const CURATED_GAMES: CuratedGame[] = [
  { id: 'fortnite', name: 'Fortnite', platform: 'Epic Games', executable_patterns: ['FortniteClient-Win64-Shipping.exe', 'FortniteGame.exe'], installed: false, executable_path: '', icon: '\uD83C\uDFAF', description: 'Battle royale, build & shoot', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'Battle Royale', tier: 'S' },
  { id: 'cod-warzone', name: 'Call of Duty: Warzone', platform: 'Battle.net', executable_patterns: ['Warzone.exe', 'ModernWarfare.exe', 'cod.exe'], installed: false, executable_path: '', icon: '\uD83D\uDD2B', description: 'Military battle royale & MP', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'S' },
  { id: 'gta5', name: 'Grand Theft Auto V', platform: 'Steam', executable_patterns: ['GTA5.exe', 'PlayGTAV.exe'], installed: false, executable_path: '', icon: '\uD83D\uDE97', description: 'Open-world crime action', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'Action', tier: 'S' },
  { id: 'minecraft', name: 'Minecraft', platform: 'Standalone', executable_patterns: ['Minecraft.exe', 'javaw.exe'], installed: false, executable_path: '', icon: '\u26CF\uFE0F', description: 'Sandbox building & survival', optimizations: { cpu_priority: 'Normal', gpu_priority: 'Low', disable_fullscreen_optimizations: false, high_dpi_aware: false, disable_game_dvr: true }, genre: 'Sandbox', tier: 'S' },
  { id: 'apex-legends', name: 'Apex Legends', platform: 'EA App', executable_patterns: ['r5apex.exe', 'Apex Legends.exe'], installed: false, executable_path: '', icon: '\u26A1', description: 'Hero-based battle royale', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'Battle Royale', tier: 'A' },
  { id: 'valorant', name: 'Valorant', platform: 'Riot Games', executable_patterns: ['VALORANT.exe', 'valorant.exe'], installed: false, executable_path: '', icon: '\uD83D\uDD2B', description: 'Tactical hero shooter', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'S' },
  { id: 'cs2', name: 'Counter-Strike 2', platform: 'Steam', executable_patterns: ['cs2.exe', 'csgo.exe'], installed: false, executable_path: '', icon: '\uD83C\uDFAF', description: 'Competitive tactical FPS', optimizations: { cpu_priority: 'High', gpu_priority: 'Normal', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'S' },
  { id: 'overwatch-2', name: 'Overwatch 2', platform: 'Battle.net', executable_patterns: ['Overwatch.exe', 'Overwatch Launcher.exe'], installed: false, executable_path: '', icon: '\uD83E\uDDB8', description: 'Hero-based team shooter', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'A' },
  { id: 'r6-siege', name: 'Rainbow Six Siege', platform: 'Ubisoft Connect', executable_patterns: ['RainbowSix.exe', 'RainbowSixSiege.exe'], installed: false, executable_path: '', icon: '\uD83D\uDD2B', description: 'Tactical breach & clear FPS', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'A' },
  { id: 'elden-ring', name: 'Elden Ring', platform: 'Steam', executable_patterns: ['eldenring.exe', 'EldenRing.exe'], installed: false, executable_path: '', icon: '\u2694\uFE0F', description: 'Open-world action RPG', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'RPG', tier: 'S' },
  { id: 'cyberpunk-2077', name: 'Cyberpunk 2077', platform: 'Steam', executable_patterns: ['Cyberpunk2077.exe', 'REDprelauncher.exe'], installed: false, executable_path: '', icon: '\uD83E\uDD16', description: 'Open-world cyberpunk RPG', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'RPG', tier: 'A' },
  { id: 'rdr2', name: 'Red Dead Redemption 2', platform: 'Steam', executable_patterns: ['RDR2.exe', 'RedDeadRedemption2.exe'], installed: false, executable_path: '', icon: '\uD83D\uDC34', description: 'Wild West open-world action', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'Action', tier: 'A' },
  { id: 'witcher-3', name: 'The Witcher 3', platform: 'Steam', executable_patterns: ['witcher3.exe', 'Witcher3.exe'], installed: false, executable_path: '', icon: '\u2694\uFE0F', description: 'Fantasy open-world RPG', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'RPG', tier: 'S' },
  { id: 'rocket-league', name: 'Rocket League', platform: 'Epic Games', executable_patterns: ['RocketLeague.exe'], installed: false, executable_path: '', icon: '\uD83D\uDE97', description: 'Vehicle soccer mayhem', optimizations: { cpu_priority: 'High', gpu_priority: 'Normal', disable_fullscreen_optimizations: true, high_dpi_aware: false, disable_game_dvr: true }, genre: 'Sports', tier: 'A' },
  { id: 'league-of-legends', name: 'League of Legends', platform: 'Riot Games', executable_patterns: ['LeagueClient.exe', 'League of Legends.exe'], installed: false, executable_path: '', icon: '\uD83D\uDDE1\uFE0F', description: 'MOBA competitive 5v5', optimizations: { cpu_priority: 'High', gpu_priority: 'Low', disable_fullscreen_optimizations: true, high_dpi_aware: false, disable_game_dvr: true }, genre: 'MOBA', tier: 'S' },
  { id: 'wow', name: 'World of Warcraft', platform: 'Battle.net', executable_patterns: ['Wow.exe', 'WowClassic.exe'], installed: false, executable_path: '', icon: '\uD83D\uDC09', description: 'Massive MMORPG world', optimizations: { cpu_priority: 'Normal', gpu_priority: 'Normal', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'MMO', tier: 'A' },
  { id: 'destiny-2', name: 'Destiny 2', platform: 'Steam', executable_patterns: ['destiny2.exe', 'Destiny2.exe'], installed: false, executable_path: '', icon: '\uD83D\uDD2B', description: 'Sci-fi looter shooter MMO', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'FPS', tier: 'A' },
  { id: 'forza-horizon-5', name: 'Forza Horizon 5', platform: 'Steam', executable_patterns: ['ForzaHorizon5.exe'], installed: false, executable_path: '', icon: '\uD83C\uDFCE\uFE0F', description: 'Open-world racing', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'Racing', tier: 'A' },
  { id: 'baldurs-gate-3', name: "Baldur's Gate 3", platform: 'Steam', executable_patterns: ['bg3.exe', 'BaldursGate3.exe'], installed: false, executable_path: '', icon: '\uD83C\uDFB2', description: 'D&D-based CRPG epic', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'RPG', tier: 'A' },
  { id: 'hogwarts-legacy', name: 'Hogwarts Legacy', platform: 'Steam', executable_patterns: ['HogwartsLegacy.exe'], installed: false, executable_path: '', icon: '\uD83E\uDDD9', description: 'Open-world Harry Potter RPG', optimizations: { cpu_priority: 'Normal', gpu_priority: 'High', disable_fullscreen_optimizations: false, high_dpi_aware: true, disable_game_dvr: false }, genre: 'RPG', tier: 'A' },
  { id: 'pubg', name: 'PUBG: Battlegrounds', platform: 'Steam', executable_patterns: ['TslGame.exe', 'PUBG.exe'], installed: false, executable_path: '', icon: '\uD83E\uDE82', description: 'Classic battle royale', optimizations: { cpu_priority: 'High', gpu_priority: 'High', disable_fullscreen_optimizations: true, high_dpi_aware: true, disable_game_dvr: true }, genre: 'Battle Royale', tier: 'B' },
  { id: 'dota-2', name: 'Dota 2', platform: 'Steam', executable_patterns: ['dota2.exe', 'Dota2.exe'], installed: false, executable_path: '', icon: '\uD83D\uDEE1\uFE0F', description: 'Competitive MOBA', optimizations: { cpu_priority: 'High', gpu_priority: 'Normal', disable_fullscreen_optimizations: true, high_dpi_aware: false, disable_game_dvr: true }, genre: 'MOBA', tier: 'S' },
];

const PLATFORM_COLORS: Record<string, string> = {
  'Steam': 'text-stone-300',
  'Epic Games': 'text-stone-300',
  'Battle.net': 'text-stone-200',
  'Riot Games': 'text-red-400',
  'Ubisoft Connect': 'text-stone-300',
  'EA App': 'text-green-400',
  'Standalone': 'text-white/40',
};

const TIER_COLORS: Record<string, string> = {
  'S': 'text-stone-300',
  'A': 'text-stone-300',
  'B': 'text-white/50',
};

const GENRE_ICONS: Record<string, typeof Cpu> = {
  'FPS': Monitor,
  'Battle Royale': Zap,
  'RPG': Cpu,
  'Action': Cpu,
  'Sandbox': Maximize2,
  'Sports': Cpu,
  'MOBA': Monitor,
  'MMO': Cpu,
  'Racing': Cpu,
};

function getOptimalSettings(game: CuratedGame) {
  const base: string[] = ['High Performance power plan'];
  if (game.optimizations.disable_game_dvr) base.push('Disable Game DVR');
  if (game.optimizations.disable_fullscreen_optimizations) base.push('Disable Fullscreen Optimizations');
  if (game.optimizations.high_dpi_aware) base.push('High DPI aware');
  base.push(`${game.optimizations.cpu_priority} CPU priority`);
  base.push(`${game.optimizations.gpu_priority} GPU priority`);
  return base;
}

export default function GameProfiles() {
  const [games, setGames] = useState<CuratedGame[]>(CURATED_GAMES);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [selectedGame, setSelectedGame] = useState<CuratedGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [extraGames, setExtraGames] = useState<GameProfile[]>([]);
  const [applying, setApplying] = useState(false);
  const [detectedIds, setDetectedIds] = useState<Set<string>>(new Set());
  const [detectError, setDetectError] = useState<string | null>(null);

  useEffect(() => {
    detectGames();
  }, []);

  const detectGames = async () => {
    setLoading(true);
    setDetectError(null);
    try {
      const detected = await invoke<GameProfile[]>('detect_installed_games');
      const detectedSet = new Set(detected.map(g => g.id));
      const matchedIds = new Set<string>();

      const updatedGames = CURATED_GAMES.map(game => {
        const match = detected.find(d =>
          d.name.toLowerCase().includes(game.name.toLowerCase()) ||
          game.name.toLowerCase().includes(d.name.toLowerCase()) ||
          d.executable_path.toLowerCase().includes(game.executable_patterns[0]?.toLowerCase() || '')
        );
        if (match) {
          matchedIds.add(game.id);
          return {
            ...game,
            installed: true,
            executable_path: match.executable_path,
          };
        }
        return { ...game, installed: false, executable_path: '' };
      });

      setDetectedIds(matchedIds);
      setGames(updatedGames);
      setExtraGames(detected.filter(d => !matchedIds.has(d.id)));
    } catch (error: any) {
      const msg = typeof error === 'string' ? error : error?.message || 'Unknown error';
      setDetectError(msg);
      console.error('Failed to detect games:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredGames = games
    .filter(game => game.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(game => filterPlatform === 'All' || game.platform === filterPlatform)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'tier') return a.tier.localeCompare(b.tier);
      if (sortBy === 'status') return Number(b.installed) - Number(a.installed);
      return 0;
    });

  const platforms = ['All', ...new Set(games.map(g => g.platform))];

  const applyGameOptimization = async (game: CuratedGame) => {
    if (!game.installed && !game.executable_path) return;
    setApplying(true);
    try {
      const targetGame = extraGames.find(e => e.name.toLowerCase().includes(game.name.toLowerCase()));
      const profileId = targetGame?.id || game.id;
      await invoke('activate_game_profile', { profileId });
      if (game.optimizations.cpu_priority === 'High') {
        await invoke('apply_tweak', { id: 'gt-high-performance-power' });
      }
      alert(`\u2705 ${game.name} optimized!\n${getOptimalSettings(game).join('\n\u2022 ')}`);
    } catch (error) {
      console.error(`Failed to optimize ${game.name}:`, error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Gamepad2 className="h-7 w-7 text-stone-300" />
        <div>
          <h1 className="text-2xl font-bold text-white">Game Profiles</h1>
          <p className="text-xs text-white/50 mt-0.5">Optimize gaming performance &mdash; available games highlighted</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-white/[0.06] bg-white/[0.03] py-2 pl-10 pr-4 text-sm text-white placeholder-white/20 focus:border-white/[0.12] focus:outline-none transition-colors"
          />
        </div>
        <CustomSelect
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'name', label: 'Sort by Name' },
            { value: 'tier', label: 'Sort by Tier' },
            { value: 'status', label: 'Sort by Status' },
          ]}
          className="w-36"
        />
        <CustomSelect
          value={filterPlatform}
          onChange={setFilterPlatform}
          options={platforms.map(p => ({ value: p, label: p === 'All' ? 'All Platforms' : p }))}
          className="w-40"
        />
        <button
          onClick={detectGames}
          disabled={loading}
          className="flex items-center gap-1.5 border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-white/40 hover:text-white hover:border-white/[0.12] transition-colors disabled:opacity-50"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Scanning...' : 'Rescan'}
        </button>
      </div>

      {detectError && (
        <div className="flex items-center gap-2 border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-400">
          <XCircle className="h-3 w-3 shrink-0" />
          <span className="flex-1">Detection error: {detectError}</span>
          <button onClick={() => setDetectError(null)} className="text-red-500 hover:text-red-300">&times;</button>
        </div>
      )}

      <div className="border border-white/[0.06] overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 bg-white/[0.03] text-[10px] font-semibold text-white/50 uppercase tracking-wider border-b border-white/[0.06]">
          <div className="p-2.5 border-r border-white/[0.06] w-8 text-center"></div>
          <div className="p-2.5 border-r border-white/[0.06]">Game</div>
          <div className="p-2.5 border-r border-white/[0.06] w-12 text-center">Tier</div>
          <div className="p-2.5 border-r border-white/[0.06] w-20 text-center">Status</div>
          <div className="p-2.5 w-24 text-center">Optimize</div>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {filteredGames.length === 0 && (
            <div className="p-8 text-center text-white/50 text-sm">No games found</div>
          )}
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-0 text-sm transition-colors ${
                game.installed ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white/[0.02]'
              } ${!game.installed ? 'opacity-40' : ''}`}
              onClick={() => setSelectedGame(game)}
            >
              <div className="p-2.5 border-r border-white/[0.06] flex items-center justify-center text-lg">
                {game.icon}
              </div>
              <div className="p-2.5 border-r border-white/[0.06] flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                  <div className={`font-medium text-sm ${game.installed ? 'text-white' : 'text-white/50'}`}>
                    {game.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium ${PLATFORM_COLORS[game.platform] || 'text-white/50'}`}>
                      {game.platform}
                    </span>
                    <span className="text-[10px] text-white/20">{game.genre}</span>
                    {game.installed && game.executable_path && (
                      <span className="text-[10px] text-white/20 truncate max-w-[200px]">{game.executable_path}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2.5 border-r border-white/[0.06] flex items-center justify-center">
                <span className={`text-xs font-bold ${TIER_COLORS[game.tier]}`}>{game.tier}</span>
              </div>
              <div className="p-2.5 border-r border-white/[0.06] flex items-center justify-center">
                {game.installed ? (
                  <span className="flex items-center gap-1 text-[10px] text-stone-300 font-medium">
                    <CheckCircle className="h-3 w-3" />
                    Available
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-white/20 font-medium">
                    <XCircle className="h-3 w-3" />
                    Not Found
                  </span>
                )}
              </div>
              <div className="p-2.5 flex items-center justify-center">
                {game.installed ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); applyGameOptimization(game); }}
                    disabled={applying}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium pill-button hover:bg-stone-300 transition-colors disabled:opacity-40"
                  >
                    <Zap className="h-3 w-3" />
                    {applying ? '...' : 'Optimize'}
                  </button>
                ) : (
                  <span className="text-[10px] text-white/20">Install to optimize</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {extraGames.length > 0 && (
        <div className="border border-white/[0.06] p-3">
          <p className="text-xs text-white/50 mb-2">Other detected software ({extraGames.length}):</p>
          <div className="flex flex-wrap gap-1.5">
            {extraGames.map(g => (
              <span key={g.id} className="px-2 py-0.5 text-[10px] border border-white/[0.06] bg-white/[0.03] text-white/40">
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {selectedGame && (
        <div className="border border-white/[0.12]/30 bg-white/[0.05] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedGame.icon}</span>
              <div>
                <h3 className="font-semibold text-white">{selectedGame.name}</h3>
                <span className={`text-xs ${PLATFORM_COLORS[selectedGame.platform] || 'text-white/50'}`}>{selectedGame.platform}</span>
              </div>
            </div>
            <span className={`text-xs font-bold ${selectedGame.installed ? 'text-stone-300' : 'text-white/20'}`}>
              {selectedGame.installed ? 'Installed' : 'Not Installed'}
            </span>
          </div>
          <p className="text-xs text-white/50">{selectedGame.description}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Cpu className="h-3.5 w-3-5" />
              CPU: <span className="text-white">{selectedGame.optimizations.cpu_priority}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Monitor className="h-3.5 w-3-5" />
              GPU: <span className="text-white">{selectedGame.optimizations.gpu_priority}</span>
            </div>
            {selectedGame.optimizations.disable_fullscreen_optimizations && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Maximize2 className="h-3.5 w-3-5" />
                Fullscreen optimizations disabled
              </div>
            )}
            {selectedGame.optimizations.disable_game_dvr && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Monitor className="h-3.5 w-3-5" />
                Game DVR disabled
              </div>
            )}
          </div>
          <div className="border-t border-white/[0.06] pt-2">
            <p className="text-[10px] text-white/50 mb-1.5 font-semibold uppercase tracking-wider">Recommended optimizations:</p>
            <ul className="space-y-0.5">
              {getOptimalSettings(selectedGame).map((s, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[10px] text-white/40">
                  <Zap className="h-2.5 w-2.5 text-stone-300" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          {selectedGame.installed && (
            <button
              onClick={() => applyGameOptimization(selectedGame)}
              disabled={applying}
              className="w-full flex items-center justify-center gap-2 pill-button hover:bg-stone-300 transition-colors disabled:opacity-40"
            >
              <Zap className="h-4 w-4" />
              {applying ? 'Optimizing...' : `Optimize ${selectedGame.name}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
