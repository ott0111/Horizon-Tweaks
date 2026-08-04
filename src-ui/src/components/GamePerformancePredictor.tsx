import React, { useState, useEffect, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Gamepad2, Cpu, Monitor, MemoryStick, CheckCircle, AlertTriangle, Zap, RefreshCw, Target, TrendingUp, Info, ChevronDown, ChevronUp, Settings2, HardDrive, Gauge, Disc } from 'lucide-react';
import CustomSelect from './CustomSelect';

interface PredictionResult {
  game_name: string;
  estimated_fps: number;
  cpu_bottleneck: boolean;
  gpu_bottleneck: boolean;
  ram_sufficient: boolean;
  rating: string;
  details: string;
  recommendations: string[];
}

const GAME_DATABASE: Record<string, {
  fullName: string;
  logo: string;
  color: string;
  engine: string;
  releaseYear: number;
  genre: string;
  api: string;
  minCpuScore: number;
  minGpuScore: number;
  minRam: number;
  recCpuScore: number;
  recGpuScore: number;
  recRam: number;
  cpuWeight: number;
  gpuWeight: number;
  ramWeight: number;
  vramRequired: number;
  storageType: 'ssd' | 'hdd' | 'nvme';
  engineEfficiency: number;
  singleThreadWeight: number;
  description: string;
}> = {
  'Fortnite': {
    fullName: 'Fortnite', logo: 'FN', color: 'from-stone-300 to-stone-500',
    engine: 'Unreal Engine 5.4', releaseYear: 2017, genre: 'Battle Royale', api: 'DX11/DX12/Nanite',
    minCpuScore: 8000, minGpuScore: 3000, minRam: 8, recCpuScore: 15000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.45, gpuWeight: 0.40, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.05, singleThreadWeight: 0.35,
    description: 'Fast-paced battle royale with Nanite/Lumen. CPU-heavy for physics/building. UE5 updates increased GPU demand significantly.',
  },
  'Valorant': {
    fullName: 'VALORANT', logo: 'VL', color: 'from-red-500 to-rose-600',
    engine: 'Unreal Engine 5 (custom)', releaseYear: 2020, genre: 'Tactical FPS', api: 'DX11',
    minCpuScore: 5000, minGpuScore: 1500, minRam: 4, recCpuScore: 12000, recGpuScore: 4000, recRam: 8,
    cpuWeight: 0.55, gpuWeight: 0.30, ramWeight: 0.15, vramRequired: 2, storageType: 'ssd',
    engineEfficiency: 1.15, singleThreadWeight: 0.45,
    description: 'Esports-optimized tactical shooter. Extremely CPU single-thread dependent; runs on virtually any GPU. High FPS targets (240-360). UE5 migration in 2025 improved visuals with minimal performance impact.',
  },
  'CS2': {
    fullName: 'Counter-Strike 2', logo: 'CS', color: 'from-stone-300 to-stone-400',
    engine: 'Source 2', releaseYear: 2023, genre: 'Tactical FPS', api: 'Vulkan/DX11',
    minCpuScore: 7000, minGpuScore: 2500, minRam: 8, recCpuScore: 14000, recGpuScore: 6000, recRam: 16,
    cpuWeight: 0.50, gpuWeight: 0.35, ramWeight: 0.15, vramRequired: 3, storageType: 'ssd',
    engineEfficiency: 1.10, singleThreadWeight: 0.45,
    description: 'Competitive FPS with Source 2. CPU-intensive for physics/tick-rate. Smoke and volumetric effects GPU-demanding.',
  },
  'Apex Legends': {
    fullName: 'Apex Legends', logo: 'AX', color: 'from-red-600 to-red-800',
    engine: 'Source Engine (modified)', releaseYear: 2019, genre: 'Battle Royale', api: 'DX11',
    minCpuScore: 6000, minGpuScore: 2500, minRam: 6, recCpuScore: 12000, recGpuScore: 6000, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.00, singleThreadWeight: 0.30,
    description: 'Fast-paced BR with large maps. GPU-bound at higher settings. Recent engine updates improved performance.',
  },
  'Call of Duty: Warzone': {
    fullName: 'Call of Duty: Warzone', logo: 'WZ', color: 'from-stone-300 to-stone-600',
    engine: 'IW Engine 9.0', releaseYear: 2020, genre: 'Battle Royale', api: 'DX12',
    minCpuScore: 9000, minGpuScore: 4000, minRam: 8, recCpuScore: 16000, recGpuScore: 8000, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.85, singleThreadWeight: 0.25,
    description: 'Massive-scale BR. Very GPU-demanding with high VRAM usage. Benefits from 16GB+ RAM and NVMe storage.',
  },
  'Minecraft': {
    fullName: 'Minecraft', logo: 'MC', color: 'from-green-500 to-green-700',
    engine: 'LWJGL / Bedrock C++', releaseYear: 2011, genre: 'Sandbox', api: 'OpenGL/Vulkan',
    minCpuScore: 3000, minGpuScore: 1000, minRam: 4, recCpuScore: 8000, recGpuScore: 3000, recRam: 16,
    cpuWeight: 0.55, gpuWeight: 0.20, ramWeight: 0.25, vramRequired: 2, storageType: 'hdd',
    engineEfficiency: 1.15, singleThreadWeight: 0.55,
    description: 'CPU-bound sandbox with chunk generation. Shader mods (SEUS, Iris) drastically increase GPU demand. Java version CPU-heavy.',
  },
  'GTA V': {
    fullName: 'Grand Theft Auto V', logo: 'GT', color: 'from-stone-300 to-stone-400',
    engine: 'RAGE', releaseYear: 2015, genre: 'Open World', api: 'DX11',
    minCpuScore: 7000, minGpuScore: 3000, minRam: 8, recCpuScore: 14000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.10, singleThreadWeight: 0.35,
    description: 'Open-world crime sandbox. Balanced CPU/GPU load; online mode CPU-heavy for NPC AI and streaming.',
  },
  'Cyberpunk 2077': {
    fullName: 'Cyberpunk 2077', logo: 'CP', color: 'from-yellow-400 to-yellow-600',
    engine: 'REDengine 4', releaseYear: 2020, genre: 'RPG', api: 'DX12/Vulkan',
    minCpuScore: 10000, minGpuScore: 5000, minRam: 8, recCpuScore: 18000, recGpuScore: 10000, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.55, ramWeight: 0.15, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.80, singleThreadWeight: 0.20,
    description: 'Extremely GPU-demanding open-world RPG. Path tracing requires RTX 40-series. DLSS/FSR essential for high settings.',
  },
  'Elden Ring': {
    fullName: 'Elden Ring', logo: 'ER', color: 'from-stone-300 to-stone-600',
    engine: 'FromSoft Engine', releaseYear: 2022, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 12, recCpuScore: 14000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 6, storageType: 'ssd',
    engineEfficiency: 0.90, singleThreadWeight: 0.30,
    description: 'Souls-like open world. Frame pacing issues on PC. GPU-bound with heavy asset streaming. Shadow of the Erdtree DLC more demanding.',
  },
  "Baldur's Gate 3": {
    fullName: "Baldur's Gate 3", logo: 'BG', color: 'from-stone-300 to-stone-600',
    engine: 'Divinity 4.0', releaseYear: 2023, genre: 'RPG', api: 'Vulkan/DX11',
    minCpuScore: 8000, minGpuScore: 3500, minRam: 8, recCpuScore: 15000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.40, ramWeight: 0.20, vramRequired: 6, storageType: 'ssd',
    engineEfficiency: 0.95, singleThreadWeight: 0.35,
    description: 'Tactical RPG with complex AI. CPU-intensive in large Act 3 city scenes. Benefits from fast NVMe storage.',
  },
  'Overwatch 2': {
    fullName: 'Overwatch 2', logo: 'OW', color: 'from-stone-300 to-red-500',
    engine: 'Proprietary (Overwatch)', releaseYear: 2022, genre: 'Team FPS', api: 'DX11',
    minCpuScore: 6000, minGpuScore: 2500, minRam: 6, recCpuScore: 12000, recGpuScore: 5000, recRam: 8,
    cpuWeight: 0.45, gpuWeight: 0.40, ramWeight: 0.15, vramRequired: 3, storageType: 'ssd',
    engineEfficiency: 1.20, singleThreadWeight: 0.40,
    description: 'Team-based hero shooter. Well-optimized; runs well on mid-range hardware. High refresh rate target.',
  },
  'League of Legends': {
    fullName: 'League of Legends', logo: 'LoL', color: 'from-stone-300 to-stone-600',
    engine: 'Riot proprietary', releaseYear: 2009, genre: 'MOBA', api: 'DX9/DX11',
    minCpuScore: 2000, minGpuScore: 800, minRam: 2, recCpuScore: 6000, recGpuScore: 2000, recRam: 8,
    cpuWeight: 0.60, gpuWeight: 0.20, ramWeight: 0.20, vramRequired: 1, storageType: 'hdd',
    engineEfficiency: 1.40, singleThreadWeight: 0.55,
    description: 'Esports MOBA. Extremely lightweight; runs on virtually any modern system. Single-thread CPU dependent.',
  },
  'Red Dead Redemption 2': {
    fullName: 'Red Dead Redemption 2', logo: 'RD', color: 'from-red-700 to-red-900',
    engine: 'RAGE 2.0', releaseYear: 2019, genre: 'Open World', api: 'Vulkan/DX12',
    minCpuScore: 9000, minGpuScore: 4500, minRam: 8, recCpuScore: 16000, recGpuScore: 8000, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.85, singleThreadWeight: 0.25,
    description: 'Massive open-world Western. Extremely GPU-demanding. Benefits from NVMe for texture streaming.',
  },
  'Starfield': {
    fullName: 'Starfield', logo: 'SF', color: 'from-stone-300 to-stone-600',
    engine: 'Creation Engine 2', releaseYear: 2023, genre: 'RPG', api: 'DX12',
    minCpuScore: 10000, minGpuScore: 5500, minRam: 16, recCpuScore: 18000, recGpuScore: 10000, recRam: 32,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.75, singleThreadWeight: 0.30,
    description: 'Space RPG. Poorly optimized at launch; benefits from DLSS/FSR. 32GB RAM recommended. NVMe essential.',
  },
  'Black Myth Wukong': {
    fullName: 'Black Myth: Wukong', logo: 'WK', color: 'from-stone-400 to-stone-700',
    engine: 'Unreal Engine 5.4', releaseYear: 2024, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 10000, minGpuScore: 5500, minRam: 16, recCpuScore: 16000, recGpuScore: 9000, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.55, ramWeight: 0.15, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.82, singleThreadWeight: 0.25,
    description: 'Stunning action RPG. Extremely GPU-demanding with full ray tracing. DLSS/FSR heavily recommended.',
  },
  'Helldivers 2': {
    fullName: 'Helldivers 2', logo: 'HD', color: 'from-stone-300 to-red-600',
    engine: 'Autodesk Stingray', releaseYear: 2024, genre: 'Co-op Shooter', api: 'DX11',
    minCpuScore: 7000, minGpuScore: 3000, minRam: 8, recCpuScore: 14000, recGpuScore: 6500, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 0.95, singleThreadWeight: 0.30,
    description: 'Co-op horde shooter. Explosions and physics CPU-heavy. GPU-bound during large-scale firefights.',
  },
  'Palworld': {
    fullName: 'Palworld', logo: 'PW', color: 'from-stone-300 to-stone-500',
    engine: 'Unreal Engine 5', releaseYear: 2024, genre: 'Survival', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 3500, minRam: 16, recCpuScore: 14000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.40, ramWeight: 0.20, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.80, singleThreadWeight: 0.30,
    description: 'Open-world survival with AI creatures. Early access performance varies. CPU for AI, GPU for open world rendering.',
  },
  "Dragon's Dogma 2": {
    fullName: "Dragon's Dogma 2", logo: 'DD', color: 'from-stone-300 to-teal-700',
    engine: 'RE Engine', releaseYear: 2024, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 9000, minGpuScore: 4500, minRam: 16, recCpuScore: 16000, recGpuScore: 8000, recRam: 16,
    cpuWeight: 0.50, gpuWeight: 0.35, ramWeight: 0.15, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.80, singleThreadWeight: 0.40,
    description: 'Open-world action RPG. Extremely CPU-bound in cities with NPC AI. GPU secondary in most areas.',
  },
  'Doom: The Dark Ages': {
    fullName: 'Doom: The Dark Ages', logo: 'DA', color: 'from-red-700 to-gray-800',
    engine: 'id Tech 8', releaseYear: 2025, genre: 'FPS', api: 'Vulkan',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 8, recCpuScore: 14000, recGpuScore: 7500, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.55, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 1.20, singleThreadWeight: 0.20,
    description: 'id Tech 8 powered FPS. Extremely well-optimized; runs great on all hardware. Vulkan renderer is default.',
  },
  'GTA VI': {
    fullName: 'Grand Theft Auto VI', logo: 'G6', color: 'from-pink-500 to-stone-500',
    engine: 'RAGE 9.0', releaseYear: 2025, genre: 'Open World', api: 'DX12',
    minCpuScore: 12000, minGpuScore: 6000, minRam: 16, recCpuScore: 20000, recGpuScore: 12000, recRam: 32,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 10, storageType: 'nvme',
    engineEfficiency: 0.85, singleThreadWeight: 0.30,
    description: 'Next-gen open world. Highly demanding next-gen title. RTX 40/50 series recommended for ray tracing features.',
  },
  'Monster Hunter Wilds': {
    fullName: 'Monster Hunter Wilds', logo: 'MH', color: 'from-stone-300 to-stone-400',
    engine: 'RE Engine', releaseYear: 2025, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 10000, minGpuScore: 5000, minRam: 16, recCpuScore: 16000, recGpuScore: 9000, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.82, singleThreadWeight: 0.25,
    description: 'Open-world hunting action. RE Engine with massive environments. GPU-demanding with detailed monster models.',
  },
  'Marvel Rivals': {
    fullName: 'Marvel Rivals', logo: 'MR', color: 'from-stone-400 to-red-600',
    engine: 'Unreal Engine 5', releaseYear: 2024, genre: 'Hero Shooter', api: 'DX12',
    minCpuScore: 7000, minGpuScore: 3000, minRam: 8, recCpuScore: 14000, recGpuScore: 6500, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 0.95, singleThreadWeight: 0.30,
    description: 'Team-based hero shooter with destructible environments. UE5 with Nanite. Well-optimized for competitive play.',
  },
  'Frostpunk 2': {
    fullName: 'Frostpunk 2', logo: 'FP', color: 'from-sky-400 to-stone-500',
    engine: 'Unreal Engine 5', releaseYear: 2024, genre: 'Strategy', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 3500, minRam: 8, recCpuScore: 14000, recGpuScore: 6000, recRam: 16,
    cpuWeight: 0.50, gpuWeight: 0.30, ramWeight: 0.20, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.00, singleThreadWeight: 0.40,
    description: 'City-building strategy. CPU-bound for simulation and AI. GPU for city rendering and weather effects.',
  },
  'Silent Hill 2': {
    fullName: 'Silent Hill 2 Remake', logo: 'SH', color: 'from-gray-500 to-gray-800',
    engine: 'Unreal Engine 5', releaseYear: 2024, genre: 'Survival Horror', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 8, recCpuScore: 14000, recGpuScore: 7500, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.55, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.85, singleThreadWeight: 0.20,
    description: 'Horror remake in UE5. Heavy atmospheric rendering, ray tracing. GPU-demanding with Lumen global illumination.',
  },
  'Forza Horizon 6': {
    fullName: 'Forza Horizon 6', logo: 'FH', color: 'from-stone-300 to-stone-500',
    engine: 'ForzaTech 2.0', releaseYear: 2025, genre: 'Racing', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 8, recCpuScore: 15000, recGpuScore: 8000, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.55, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.95, singleThreadWeight: 0.20,
    description: 'Open-world arcade racer. GPU-bound with massive draw distances, dynamic weather, and ray traced reflections. Runs well on mid-range hardware at 1080p.',
  },
  'Assetto Corsa Evo': {
    fullName: 'Assetto Corsa Evo', logo: 'AC', color: 'from-stone-300 to-stone-400',
    engine: 'Unreal Engine 5', releaseYear: 2025, genre: 'Sim Racing', api: 'Vulkan/DX12',
    minCpuScore: 9000, minGpuScore: 4500, minRam: 16, recCpuScore: 16000, recGpuScore: 8500, recRam: 16,
    cpuWeight: 0.30, gpuWeight: 0.50, ramWeight: 0.20, vramRequired: 8, storageType: 'nvme',
    engineEfficiency: 0.82, singleThreadWeight: 0.25,
    description: 'Sim racing in UE5. Features full ray tracing, Lumen, and Nanite. CPU-bound for physics simulation; GPU-bound for rendering. DLSS/FSR essential.',
  },
  'Kingdom Come: Deliverance 2': {
    fullName: 'Kingdom Come: Deliverance 2', logo: 'KC', color: 'from-stone-400 to-teal-700',
    engine: 'CryEngine (modified)', releaseYear: 2025, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 9000, minGpuScore: 4000, minRam: 16, recCpuScore: 16000, recGpuScore: 8000, recRam: 32,
    cpuWeight: 0.45, gpuWeight: 0.40, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.90, singleThreadWeight: 0.40,
    description: 'Open-world medieval RPG. Very CPU-heavy for NPC AI and physics simulation. Large cities tank frame rates. 32GB RAM recommended for smooth gameplay.',
  },
  'Avowed': {
    fullName: 'Avowed', logo: 'AV', color: 'from-stone-300 to-stone-600',
    engine: 'Unreal Engine 5', releaseYear: 2025, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 8, recCpuScore: 14000, recGpuScore: 7500, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.88, singleThreadWeight: 0.25,
    description: 'First-person RPG in Eora. UE5 with Lumen/Nanite. GPU-demanding in outdoor zones. DLSS/FSR helpful for maintaining 60 FPS.',
  },
  'Fable': {
    fullName: 'Fable (2025)', logo: 'FB', color: 'from-stone-300 to-stone-600',
    engine: 'ForzaTech (modified)', releaseYear: 2025, genre: 'Action RPG', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 4000, minRam: 8, recCpuScore: 14000, recGpuScore: 7500, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.92, singleThreadWeight: 0.30,
    description: 'Reboot of the beloved RPG series. Beautiful stylized open world. Balanced CPU/GPU load with lots of interactive foliage and NPCs.',
  },
  'Atomfall': {
    fullName: 'Atomfall', logo: 'AT', color: 'from-stone-400 to-red-800',
    engine: 'Unreal Engine 4', releaseYear: 2025, genre: 'Survival Action', api: 'DX11/DX12',
    minCpuScore: 7000, minGpuScore: 3000, minRam: 8, recCpuScore: 13000, recGpuScore: 6000, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.00, singleThreadWeight: 0.30,
    description: 'Post-apocalyptic survival FPS set in a British quarantine zone. UE4 holds up well. Balanced CPU/GPU with dense foliage and AI-driven enemies.',
  },
  'Sniper Elite: Resistance': {
    fullName: 'Sniper Elite: Resistance', logo: 'SE', color: 'from-gray-700 to-gray-900',
    engine: 'Asura Engine', releaseYear: 2025, genre: 'Tactical Shooter', api: 'DX12',
    minCpuScore: 6000, minGpuScore: 3000, minRam: 8, recCpuScore: 12000, recGpuScore: 5500, recRam: 16,
    cpuWeight: 0.40, gpuWeight: 0.45, ramWeight: 0.15, vramRequired: 4, storageType: 'ssd',
    engineEfficiency: 1.05, singleThreadWeight: 0.30,
    description: 'Tactical sniper shooter with X-ray kill cams. Well-optimized. GPU-bound for rendering large open levels with detailed bullet physics.',
  },
  'The First Berserker: Khazan': {
    fullName: 'The First Berserker: Khazan', logo: 'BZ', color: 'from-red-700 to-black',
    engine: 'Unreal Engine 5', releaseYear: 2025, genre: 'Soulslike Action RPG', api: 'DX12',
    minCpuScore: 8000, minGpuScore: 3500, minRam: 8, recCpuScore: 14000, recGpuScore: 7000, recRam: 16,
    cpuWeight: 0.35, gpuWeight: 0.50, ramWeight: 0.15, vramRequired: 6, storageType: 'nvme',
    engineEfficiency: 0.85, singleThreadWeight: 0.25,
    description: 'Soulslike action RPG with cel-shaded UE5 visuals. Performance-heavy for an anime-styled game. Fast-paced combat relies on consistent frame pacing.',
  },
};

const POPULAR_GAMES = Object.keys(GAME_DATABASE);

const GAME_DEFAULTS: Record<string, { resolution: string; quality: string; rayTracing: string; upscaling: string; targetFps: number }> = {
  'Valorant': { resolution: '1080p', quality: 'Low', rayTracing: 'Off', upscaling: 'None', targetFps: 240 },
  'CS2': { resolution: '1080p', quality: 'Low', rayTracing: 'Off', upscaling: 'None', targetFps: 240 },
  'Overwatch 2': { resolution: '1080p', quality: 'Low', rayTracing: 'Off', upscaling: 'None', targetFps: 240 },
  'Apex Legends': { resolution: '1080p', quality: 'Low', rayTracing: 'Off', upscaling: 'None', targetFps: 240 },
  'Marvel Rivals': { resolution: '1080p', quality: 'Low', rayTracing: 'Off', upscaling: 'None', targetFps: 240 },
  'Minecraft': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'League of Legends': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Fortnite': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'GTA V': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Doom: The Dark Ages': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Palworld': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Frostpunk 2': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Atomfall': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Sniper Elite: Resistance': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Forza Horizon 6': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 144 },
  'Fable': { resolution: '1080p', quality: 'High', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Call of Duty: Warzone': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 120 },
  'Cyberpunk 2077': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Starfield': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Elden Ring': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  "Baldur's Gate 3": { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Red Dead Redemption 2': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Black Myth Wukong': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Helldivers 2': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 120 },
  "Dragon's Dogma 2": { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'GTA VI': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Monster Hunter Wilds': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Silent Hill 2': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Assetto Corsa Evo': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 120 },
  'Kingdom Come: Deliverance 2': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'Avowed': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
  'The First Berserker: Khazan': { resolution: '1080p', quality: 'Medium', rayTracing: 'Off', upscaling: 'None', targetFps: 60 },
};

const RESOLUTION_MULTS: Record<string, number> = { '720p': 1.4, '1080p': 1.0, '1440p': 0.65, '4K': 0.35 };
const QUALITY_MULTS: Record<string, number> = { 'Low': 1.9, 'Medium': 1.0, 'High': 0.7, 'Ultra': 0.45 };
const RT_MULTS: Record<string, number> = { 'Off': 1.0, 'On': 0.5 };
const UPSCALING_MULTS: Record<string, number> = { 'None': 1.0, 'DLSS Quality': 1.5, 'DLSS Balanced': 1.8, 'DLSS Performance': 2.0, 'FSR Quality': 1.4, 'FSR Balanced': 1.6, 'FSR Performance': 1.8 };

const RESOLUTIONS = ['720p', '1080p', '1440p', '4K'];
const QUALITIES = ['Low', 'Medium', 'High', 'Ultra'];
const UPSCALING_OPTIONS = ['None', 'DLSS Quality', 'DLSS Balanced', 'DLSS Performance', 'FSR Quality', 'FSR Balanced', 'FSR Performance'];
const TARGET_FPS_OPTIONS = [30, 60, 90, 120, 144, 165, 240];

const RESOLUTION_OPTIONS = RESOLUTIONS.map(r => ({ value: r, label: r }));
const QUALITY_OPTIONS = QUALITIES.map(q => ({ value: q, label: q }));
const RT_OPTIONS = [{ value: 'Off', label: 'Off' }, { value: 'On', label: 'On' }];
const UPSCALING_OPTIONS_MAPPED = UPSCALING_OPTIONS.map(u => ({ value: u, label: u }));
const TARGET_FPS_OPTIONS_MAPPED = TARGET_FPS_OPTIONS.map(f => ({ value: String(f), label: `${f}` }));
const TARGET_FPS_OPTIONS_ALL = [...TARGET_FPS_OPTIONS_MAPPED, { value: '999', label: 'Unlimited' }];

function getCpuScoreFromName(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('ultra 9 285k') || n.includes('285k')) return 56000;
  if (n.includes('ultra 7 265k') || n.includes('265k')) return 44000;
  if (n.includes('ultra 5 245k') || n.includes('245k')) return 36000;
  if (n.includes('14900ks')) return 65000;
  if (n.includes('14900k') || n.includes('14900')) return 62000;
  if (n.includes('13900k') || n.includes('13900')) return 58000;
  if (n.includes('9950x')) return 57000;
  if (n.includes('9900x')) return 50000;
  if (n.includes('7950x')) return 55000;
  if (n.includes('7900x')) return 48000;
  if (n.includes('14700k') || n.includes('14700')) return 48000;
  if (n.includes('13700k') || n.includes('13700')) return 44000;
  if (n.includes('9800x3d')) return 46000;
  if (n.includes('7800x3d')) return 42000;
  if (n.includes('14600k') || n.includes('14600')) return 38000;
  if (n.includes('13600k') || n.includes('13600')) return 35000;
  if (n.includes('9700x')) return 37000;
  if (n.includes('9600x')) return 33000;
  if (n.includes('7700x')) return 35000;
  if (n.includes('7600x') || n.includes('7600')) return 30000;
  if (n.includes('12900k') || n.includes('12900')) return 40000;
  if (n.includes('12700k') || n.includes('12700')) return 34000;
  if (n.includes('12600k') || n.includes('12600')) return 30000;
  if (n.includes('12400') || n.includes('12100')) return 22000;
  if (n.includes('11900k') || n.includes('11900')) return 24000;
  if (n.includes('11700k') || n.includes('11700')) return 21000;
  if (n.includes('11400') || n.includes('11100')) return 18000;
  if (n.includes('10900k') || n.includes('10900')) return 22000;
  if (n.includes('10700k') || n.includes('10700')) return 19000;
  if (n.includes('10400') || n.includes('10100')) return 15000;
  if (n.includes('ryzen 9')) return 50000;
  if (n.includes('ryzen 7')) return 35000;
  if (n.includes('ryzen 5')) return 25000;
  if (n.includes('ryzen 3')) return 15000;
  if (n.includes('i9')) return 45000;
  if (n.includes('i7')) return 30000;
  if (n.includes('i5')) return 22000;
  if (n.includes('i3')) return 12000;
  return 18000;
}

function getGpuScoreFromName(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('5090')) return 42000;
  if (n.includes('5080')) return 33000;
  if (n.includes('5070 ti')) return 27000;
  if (n.includes('5070')) return 23000;
  if (n.includes('4090')) return 36000;
  if (n.includes('4080 super') || n.includes('4080')) return 29000;
  if (n.includes('7900 xtx') || n.includes('7900xtx')) return 26000;
  if (n.includes('5060 ti')) return 20000;
  if (n.includes('4070 ti super') || n.includes('4070 ti')) return 23000;
  if (n.includes('3090 ti')) return 23000;
  if (n.includes('7900 xt')) return 21000;
  if (n.includes('4070 super') || n.includes('4070')) return 19000;
  if (n.includes('3090')) return 21000;
  if (n.includes('9070 xt')) return 21000;
  if (n.includes('3080 ti')) return 19000;
  if (n.includes('3080')) return 17500;
  if (n.includes('7800 xt')) return 16500;
  if (n.includes('5060')) return 17000;
  if (n.includes('4060 ti')) return 14500;
  if (n.includes('3070 ti')) return 15000;
  if (n.includes('3070')) return 13500;
  if (n.includes('7700 xt')) return 14000;
  if (n.includes('4060')) return 11500;
  if (n.includes('7600 xt')) return 12000;
  if (n.includes('7600')) return 10500;
  if (n.includes('3060 ti')) return 11500;
  if (n.includes('3060')) return 9000;
  if (n.includes('2080 ti')) return 14000;
  if (n.includes('2080 super')) return 12000;
  if (n.includes('2080')) return 11000;
  if (n.includes('2070 super')) return 10500;
  if (n.includes('2070')) return 9500;
  if (n.includes('2060 super')) return 9000;
  if (n.includes('2060')) return 8000;
  if (n.includes('1660 super') || n.includes('1660 ti')) return 6500;
  if (n.includes('1660')) return 5800;
  if (n.includes('1080 ti')) return 9000;
  if (n.includes('1080')) return 7000;
  if (n.includes('1070 ti')) return 7000;
  if (n.includes('1070')) return 6000;
  if (n.includes('1060')) return 4500;
  if (n.includes('1050 ti')) return 3500;
  if (n.includes('1050')) return 3000;
  if (n.includes('b580')) return 12000;
  if (n.includes('b570')) return 10000;
  if (n.includes('impulse a770')) return 11000;
  if (n.includes('impulse a750')) return 9500;
  if (n.includes('impulse')) return 7000;
  if (n.includes('uhd') || n.includes('intel') || n.includes('vega') || n.includes('iris')) return 2000;
  return 6000;
}

function getVramFromGpuName(name: string): number {
  const n = name.toLowerCase();
  if (n.includes('5090')) return 32;
  if (n.includes('5080')) return 16;
  if (n.includes('5070')) return 12;
  if (n.includes('4090')) return 24;
  if (n.includes('4080')) return 16;
  if (n.includes('7900 xtx')) return 24;
  if (n.includes('7900 xt')) return 20;
  if (n.includes('4070 ti')) return 12;
  if (n.includes('3090')) return 24;
  if (n.includes('4070')) return 12;
  if (n.includes('3080')) return 10;
  if (n.includes('7800 xt')) return 16;
  if (n.includes('4060 ti')) return 8;
  if (n.includes('3070')) return 8;
  if (n.includes('7700 xt')) return 12;
  if (n.includes('4060')) return 8;
  if (n.includes('7600')) return 8;
  if (n.includes('3060')) return 12;
  if (n.includes('2060')) return 6;
  if (n.includes('1660')) return 6;
  if (n.includes('1060')) return 6;
  if (n.includes('1050')) return 4;
  return 6;
}

const TWEAK_KEYWORDS: Record<string, number> = {
  'power plan': 0.15,
  'gpu scheduler': 0.08,
  'cpu priority': 0.12,
  'memory': 0.05,
  'network': 0.05,
  'debloat': 0.08,
  'game mode': 0.10,
  'background apps': 0.07,
  'fullscreen optimizations': 0.05,
  'high performance power plan': 0.10,
};

function computeTweakFactor(tweaks: string[]): number {
  let total = 0;
  const lowered = tweaks.map(t => t.toLowerCase());
  for (const keyword of Object.keys(TWEAK_KEYWORDS)) {
    if (lowered.some(t => t.includes(keyword))) {
      total += TWEAK_KEYWORDS[keyword];
    }
  }
  return Math.min(1.0 + total, 2.0);
}

function computeHardwareBase(cpuScore: number, gpuScore: number, ramGB: number, vramGB: number, game: typeof GAME_DATABASE[string]): number {
  const cpuRatio = Math.min(cpuScore / game.recCpuScore, 1.5);
  const gpuRatio = Math.min(gpuScore / game.recGpuScore, 1.5);
  const ramRatio = Math.min(ramGB / game.recRam, 1.5);
  const vramRatio = Math.min(vramGB / game.vramRequired, 1.5);
  const singleThreadBonus = (cpuRatio - 1) * game.singleThreadWeight * 0.15;
  const vramPenalty = vramRatio < 1 ? (1 - vramRatio) * 0.25 : 0;
  const ramPenalty = ramRatio < 1 ? (1 - ramRatio) * 0.20 : 0;
  return 60 * game.engineEfficiency * (
    cpuRatio * game.cpuWeight +
    gpuRatio * game.gpuWeight +
    ramRatio * game.ramWeight +
    singleThreadBonus - vramPenalty - ramPenalty
  );
}

function computeSettingsFactor(resolution: string, quality: string, rayTracing: string, upscaling: string): number {
  return (RESOLUTION_MULTS[resolution] ?? 1.0) *
    (QUALITY_MULTS[quality] ?? 1.0) *
    (RT_MULTS[rayTracing] ?? 1.0) *
    (UPSCALING_MULTS[upscaling] ?? 1.0);
}

interface FPSScenario {
  name: string;
  resolution: string;
  settings: string;
  estimatedFps: number;
  onePercentLow: number;
  zeroOneLow: number;
  description: string;
}

function generateScenarios(
  cpuScore: number,
  gpuScore: number,
  ramGB: number,
  vramGB: number,
  game: typeof GAME_DATABASE[string],
  tweakFactor: number
): FPSScenario[] {
  const base = computeHardwareBase(cpuScore, gpuScore, ramGB, vramGB, game);

  const cfg: { name: string; res: string; qual: string; rt: string; up: string; overhead: number; desc: string }[] = [
    { name: 'Competitive Low', res: '1080p', qual: 'Low', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Maximum FPS for competitive play. Minimal visuals, maximum clarity.' },
    { name: 'Balanced Medium', res: '1080p', qual: 'Medium', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Best balance of visual quality and performance.' },
    { name: 'Quality High', res: '1080p', qual: 'High', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Enhanced visuals. May reduce FPS in demanding scenes.' },
    { name: 'Ultra Max', res: '1080p', qual: 'Ultra', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Maximum visual fidelity. Requires high-end hardware.' },
    { name: '1440p Balanced', res: '1440p', qual: 'Medium', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Higher resolution, medium settings. ~40% more GPU load than 1080p.' },
    { name: '1440p Ultra', res: '1440p', qual: 'Ultra', rt: 'Off', up: 'None', overhead: 1.0, desc: '1440p with max settings. High-end GPU required.' },
    { name: '4K Balanced', res: '4K', qual: 'Medium', rt: 'Off', up: 'None', overhead: 1.0, desc: '4K with medium settings. ~4x GPU load vs 1080p. RTX 4070+ recommended.' },
    { name: '4K Ultra', res: '4K', qual: 'Ultra', rt: 'Off', up: 'None', overhead: 1.0, desc: '4K max settings. Only RTX 4080/5080+ can handle this.' },
    { name: 'Streaming (NVENC)', res: '1080p', qual: 'Medium', rt: 'Off', up: 'None', overhead: 0.82, desc: 'Medium settings with OBS NVENC encoding. ~18% overhead for streaming.' },
    { name: 'RT On', res: '1440p', qual: 'High', rt: 'On', up: 'None', overhead: 1.0, desc: '1440p High with ray tracing enabled. RT halves FPS on non-RTX cards.' },
    { name: 'DLSS Quality', res: '1440p', qual: 'High', rt: 'Off', up: 'DLSS Quality', overhead: 1.0, desc: '1440p High with DLSS Quality upscaling. ~50% FPS boost over native.' },
    { name: 'DLSS Perf / FSR', res: '4K', qual: 'High', rt: 'Off', up: 'DLSS Performance', overhead: 1.0, desc: '4K with DLSS Performance or FSR. ~2x FPS over native 4K.' },
    { name: 'VR Ready', res: '1440p', qual: 'Medium', rt: 'Off', up: 'None', overhead: 0.55, desc: 'VR headset rendering (per-eye). Needs consistent 90 FPS minimum.' },
    { name: '1440p Low Comp', res: '1440p', qual: 'Low', rt: 'Off', up: 'None', overhead: 1.0, desc: '1440p with Low settings. Higher clarity with competitive FPS.' },
    { name: '1080p Ultra RT', res: '1080p', qual: 'Ultra', rt: 'On', up: 'None', overhead: 1.0, desc: '1080p max settings with RT. Heaviest preset.' },
    { name: 'Competitive + 240Hz', res: '1080p', qual: 'Low', rt: 'Off', up: 'None', overhead: 1.0, desc: 'Low settings targeting 240Hz monitors. CPU matters most.' },
  ];

  return cfg.map(c => {
    const sf = computeSettingsFactor(c.res, c.qual, c.rt, c.up);
    const fps = Math.round(base * sf * tweakFactor * c.overhead);
    return {
      name: c.name,
      resolution: c.res,
      settings: `${c.qual}${c.rt === 'On' ? ' + RT' : ''}${c.up !== 'None' ? ' + ' + c.up : ''}${c.overhead < 1 ? ' + Stream' : ''}`,
      estimatedFps: fps,
      onePercentLow: Math.round(fps * 0.70),
      zeroOneLow: Math.round(fps * 0.50),
      description: c.desc,
    };
  });
}

const GameLogo = React.memo(function GameLogo({ game, size = 'md' }: { game: string; size?: 'sm' | 'md' | 'lg' }) {
  const g = GAME_DATABASE[game];
  if (!g) return <div className="rounded-xl bg-steel-700 flex items-center justify-center"><Gamepad2 className="text-steel-400" /></div>;
  const sizeClass = size === 'sm' ? 'size-8 text-[9px]' : size === 'lg' ? 'size-16 text-lg' : 'size-10 text-xs';
  return (
    <div className={`${sizeClass} rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center font-black text-white shadow-lg shrink-0`}>
      {g.logo}
    </div>
  );
});

const FPSBar = React.memo(function FPSBar({ fps, max = 240 }: { fps: number; max?: number }) {
  const pct = Math.min((fps / max) * 100, 100);
  const color = fps >= 144 ? 'bg-stone-300' : fps >= 90 ? 'bg-steel-300' : fps >= 60 ? 'bg-steel-500' : fps >= 30 ? 'bg-stone-300' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black font-mono text-steel-100">{fps}</span>
        <span className="text-lg text-steel-500 mb-1">FPS</span>
      </div>
      <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden border border-white/[0.04]">
        <div className={`h-full rounded-full transition-all duration-1000 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-steel-600">
        <span>0</span><span>30</span><span>60</span><span>90</span><span>144</span><span>240</span>
      </div>
    </div>
  );
});

function FPSRating({ fps }: { fps: number }) {
  if (fps >= 144) return { label: 'Excellent', color: 'text-stone-300', bg: 'bg-stone-300/10 border-stone-300/20', desc: 'High refresh rate gaming' };
  if (fps >= 90) return { label: 'Good', color: 'text-steel-200', bg: 'bg-steel-600/20 border-steel-500/20', desc: 'Smooth gameplay' };
  if (fps >= 60) return { label: 'Playable', color: 'text-steel-400', bg: 'bg-steel-700/20 border-steel-600/20', desc: 'Console-level experience' };
  if (fps >= 30) return { label: 'Low', color: 'text-stone-300', bg: 'bg-stone-300/10 border-stone-300/20', desc: 'Below 60 FPS — noticeable stutter' };
  return { label: 'Unplayable', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', desc: 'Significant performance issues' };
}

function generateRecommendations(
  fps: number,
  targetFps: number,
  cpuBottleneck: boolean,
  gpuBottleneck: boolean,
  ramSufficient: boolean,
  vramGB: number,
  vramRequired: number,
  rayTracing: string,
  upscaling: string,
  quality: string,
  tweakFactor: number,
  game: typeof GAME_DATABASE[string]
): string[] {
  const recs: string[] = [];
  if (fps < targetFps) {
    recs.push(`Lower graphics quality from "${quality}" to improve FPS toward ${targetFps} target`);
    recs.push('Reduce resolution or enable upscaling to gain FPS');
  }
  if (cpuBottleneck) {
    recs.push('CPU is the bottleneck — reduce CPU-heavy settings (draw distance, physics, crowd density)');
  }
  if (gpuBottleneck) {
    if (rayTracing === 'On') recs.push('Disable ray tracing to significantly improve GPU-bound performance');
    if (upscaling === 'None') recs.push('Enable DLSS or FSR upscaling to reduce GPU load');
    recs.push('Lower shadow quality, reflections, and post-processing effects');
  }
  if (!ramSufficient) {
    recs.push(`Game recommends ${game.recRam}GB RAM — close background apps or upgrade RAM to reduce stuttering`);
  }
  if (vramGB < vramRequired) {
    recs.push(`VRAM (${vramGB}GB) below game requirement (${vramRequired}GB) — lower texture quality to reduce VRAM usage`);
  }
  if (tweakFactor <= 1.0) {
    recs.push('Apply Horizon Tweaks optimizations (power plan, GPU scheduler, game mode) for up to a 70% FPS boost');
  }
  if (recs.length === 0) {
    recs.push(`Your system exceeds requirements for ${game.fullName} at current settings — enjoy smooth gameplay!`);
  }
  return recs.slice(0, 5);
}

export default function GamePerformancePredictor() {
  const [customGame, setCustomGame] = useState('');
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [selectedGame, setSelectedGame] = useState('');
  const [showScenarios, setShowScenarios] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showSpecs, setShowSpecs] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [gameDetails, setGameDetails] = useState<typeof GAME_DATABASE[string] | null>(null);
  const [systemSpecs, setSystemSpecs] = useState<{ cpuScore: number; gpuScore: number; ramGB: number; cpuName: string; gpuName: string; vramGB: number }>({
    cpuScore: 18000, gpuScore: 6000, ramGB: 16, cpuName: '', gpuName: '', vramGB: 6,
  });
  const [resolution, setResolution] = useState('1080p');
  const [quality, setQuality] = useState('Medium');
  const [rayTracing, setRayTracing] = useState('Off');
  const [upscaling, setUpscaling] = useState('None');
  const [targetFps, setTargetFps] = useState(60);
  const [settingsChangedSinceResult, setSettingsChangedSinceResult] = useState(false);
  const [lastPredictedSettings, setLastPredictedSettings] = useState<{ resolution: string; quality: string; rayTracing: string; upscaling: string; targetFps: number } | null>(null);
  const [tweakFactor, setTweakFactor] = useState(1.0);

  useEffect(() => {
    const fetchSpecs = async () => {
      try {
        const basic = await invoke<{ cpu_name: string; total_memory_gb: number }>('get_system_status_basic');
        const gpu = await invoke<{ gpu_name: string }>('get_gpu_info');
        const cpuScore = getCpuScoreFromName(basic.cpu_name);
        const gpuScore = getGpuScoreFromName(gpu.gpu_name);
        const vramGB = getVramFromGpuName(gpu.gpu_name);
        setSystemSpecs({ cpuScore, gpuScore, ramGB: basic.total_memory_gb, cpuName: basic.cpu_name, gpuName: gpu.gpu_name, vramGB });
        try {
          const tweaks = await invoke<string[]>('get_applied_tweaks');
          setTweakFactor(computeTweakFactor(tweaks));
        } catch {
          setTweakFactor(1.0);
        }
      } catch {}
    };
    fetchSpecs();
  }, []);

  useEffect(() => {
    if (!lastPredictedSettings) return;
    const current = { resolution, quality, rayTracing, upscaling, targetFps };
    if (JSON.stringify(current) !== JSON.stringify(lastPredictedSettings)) {
      setSettingsChangedSinceResult(true);
    }
  }, [resolution, quality, rayTracing, upscaling, targetFps, lastPredictedSettings]);

  const computePrediction = (gameName: string, applyDefaults = true) => {
    if (!gameName.trim()) return;
    setPredicting(true);
    setResult(null);
    setSelectedGame(gameName);
    const game = GAME_DATABASE[gameName] || null;
    setGameDetails(game);
    setShowScenarios(false);
    setSettingsChangedSinceResult(false);

    const defaults = applyDefaults ? GAME_DEFAULTS[gameName] : null;
    const res = defaults?.resolution ?? resolution;
    const qual = defaults?.quality ?? quality;
    const rt = defaults?.rayTracing ?? rayTracing;
    const up = defaults?.upscaling ?? upscaling;
    const tf = defaults?.targetFps ?? targetFps;

    if (defaults) {
      setResolution(res);
      setQuality(qual);
      setRayTracing(rt);
      setUpscaling(up);
      setTargetFps(tf);
    }

    setLastPredictedSettings({ resolution: res, quality: qual, rayTracing: rt, upscaling: up, targetFps: tf });

    setTimeout(() => {
      if (!game) {
        setResult({
          game_name: gameName,
          estimated_fps: 60,
          cpu_bottleneck: false,
          gpu_bottleneck: false,
          ram_sufficient: true,
          rating: 'Average',
          details: 'Game not found in database. Showing default estimate.',
          recommendations: ['Add this game to the database for accurate predictions'],
        });
        setPredicting(false);
        return;
      }

      const cpuRatio = Math.min(systemSpecs.cpuScore / game.recCpuScore, 1.5);
      const gpuRatio = Math.min(systemSpecs.gpuScore / game.recGpuScore, 1.5);
      const ramRatio = Math.min(systemSpecs.ramGB / game.recRam, 1.5);
      const vramRatio = Math.min(systemSpecs.vramGB / game.vramRequired, 1.5);

      const singleThreadBonus = (cpuRatio - 1) * game.singleThreadWeight * 0.15;
      const vramPenalty = vramRatio < 1 ? (1 - vramRatio) * 0.25 : 0;
      const ramPenalty = ramRatio < 1 ? (1 - ramRatio) * 0.20 : 0;

      const base = computeHardwareBase(systemSpecs.cpuScore, systemSpecs.gpuScore, systemSpecs.ramGB, systemSpecs.vramGB, game);
      const settingsFactor = computeSettingsFactor(res, qual, rt, up);
      const estimatedFps = Math.round(base * settingsFactor * tweakFactor);

      const cpuBottleneck = cpuRatio < gpuRatio && cpuRatio < 0.9;
      const gpuBottleneck = gpuRatio < cpuRatio && gpuRatio < 0.9;
      const ramSufficient = systemSpecs.ramGB >= game.minRam;

      const rating = estimatedFps >= 144 ? 'Excellent' : estimatedFps >= 90 ? 'Good' : estimatedFps >= 60 ? 'Average' : estimatedFps >= 30 ? 'Low' : 'Unplayable';

      const details = `${game.fullName} at ${res} ${qual}${rt === 'On' ? ' with RT' : ''}${up !== 'None' ? ` using ${up}` : ''}. ${cpuBottleneck ? 'CPU may limit frame rates in CPU-heavy scenes.' : ''} ${gpuBottleneck ? 'GPU may struggle with these settings.' : ''} ${!ramSufficient ? 'RAM may be insufficient.' : ''} Tweaks provide a ${Math.round((tweakFactor - 1) * 100)}% FPS boost.`;

      const recs = generateRecommendations(
        estimatedFps, tf, cpuBottleneck, gpuBottleneck, ramSufficient,
        systemSpecs.vramGB, game.vramRequired, rt, up, qual, tweakFactor, game
      );

      setResult({
        game_name: gameName,
        estimated_fps: estimatedFps,
        cpu_bottleneck: cpuBottleneck,
        gpu_bottleneck: gpuBottleneck,
        ram_sufficient: ramSufficient,
        rating,
        details,
        recommendations: recs,
      });
      setPredicting(false);
    }, 300);
  };

  const rating = result ? FPSRating({ fps: result.estimated_fps }) : null;

  const scenarios = useMemo(() => {
    if (!gameDetails || !showScenarios) return [];
    return generateScenarios(systemSpecs.cpuScore, systemSpecs.gpuScore, systemSpecs.ramGB, systemSpecs.vramGB, gameDetails, tweakFactor);
  }, [systemSpecs.cpuScore, systemSpecs.gpuScore, systemSpecs.ramGB, systemSpecs.vramGB, gameDetails, showScenarios, tweakFactor]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="size-11 rounded-xl bg-gradient-to-br from-steel-600 to-steel-800 flex items-center justify-center shadow-neo-raised border border-white/[0.06]">
          <Target className="size-5 text-steel-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Game Performance Analyzer</h1>
          <p className="text-xs text-steel-500 mt-0.5">Settings &amp; tweak-aware FPS prediction with physics-based modeling</p>
        </div>
      </div>

      {/* System Specs Card */}
      <div className="glass-card p-4">
        <button onClick={() => setShowSpecs(!showSpecs)} className="flex items-center gap-2 w-full">
          <Cpu className="size-4 text-stone-300" />
          <span className="text-sm font-semibold text-steel-200">Your System</span>
          <span className="text-[9px] text-steel-600 ml-1">Auto-detected</span>
          {showSpecs ? <ChevronUp className="size-3.5 text-steel-500 ml-auto" /> : <ChevronDown className="size-3.5 text-steel-500 ml-auto" />}
        </button>
        {showSpecs && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-steel-600 uppercase">CPU</div>
              <div className="text-xs font-semibold text-steel-200 mt-0.5 truncate">{systemSpecs.cpuName || 'Detecting...'}</div>
              <div className="text-[10px] text-stone-300 font-mono mt-0.5">Score: {systemSpecs.cpuScore.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-steel-600 uppercase">GPU</div>
              <div className="text-xs font-semibold text-steel-200 mt-0.5 truncate">{systemSpecs.gpuName || 'Detecting...'}</div>
              <div className="text-[10px] text-stone-300 font-mono mt-0.5">Score: {systemSpecs.gpuScore.toLocaleString()}</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-steel-600 uppercase">RAM</div>
              <div className="text-xs font-semibold text-steel-200 mt-0.5">{systemSpecs.ramGB} GB</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-steel-600 uppercase">VRAM</div>
              <div className="text-xs font-semibold text-steel-200 mt-0.5">{systemSpecs.vramGB} GB</div>
            </div>
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
              <div className="text-[9px] text-steel-600 uppercase">Bottleneck</div>
              <div className="text-xs font-semibold mt-0.5">
                {systemSpecs.cpuScore / systemSpecs.gpuScore > 2.5
                  ? <span className="text-stone-300">GPU-bound</span>
                  : systemSpecs.gpuScore / systemSpecs.cpuScore > 2.5
                    ? <span className="text-stone-300">CPU-bound</span>
                    : <span className="text-stone-300">Balanced</span>
                }
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Settings Configurator */}
      <div className="glass-card p-4">
        <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 w-full">
          <Settings2 className="size-4 text-stone-300" />
          <span className="text-sm font-semibold text-steel-200">Game Settings</span>
          <span className="text-[9px] text-steel-600 ml-1">FPS target: {targetFps}</span>
          {showSettings ? <ChevronUp className="size-3.5 text-steel-500 ml-auto" /> : <ChevronDown className="size-3.5 text-steel-500 ml-auto" />}
        </button>
        {showSettings && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] text-steel-600 uppercase block mb-1">Resolution</label>
              <CustomSelect value={resolution} onChange={setResolution} options={RESOLUTION_OPTIONS} placeholder="Resolution" className="w-full" />
            </div>
            <div>
              <label className="text-[9px] text-steel-600 uppercase block mb-1">Quality</label>
              <CustomSelect value={quality} onChange={setQuality} options={QUALITY_OPTIONS} placeholder="Quality" className="w-full" />
            </div>
            <div>
              <label className="text-[9px] text-steel-600 uppercase block mb-1">Ray Tracing</label>
              <CustomSelect value={rayTracing} onChange={setRayTracing} options={RT_OPTIONS} placeholder="RT" className="w-full" />
            </div>
            <div>
              <label className="text-[9px] text-steel-600 uppercase block mb-1">Upscaling</label>
              <CustomSelect value={upscaling} onChange={setUpscaling} options={UPSCALING_OPTIONS_MAPPED} placeholder="Upscaling" className="w-full" />
            </div>
            <div>
              <label className="text-[9px] text-steel-600 uppercase block mb-1">Target FPS</label>
              <CustomSelect value={String(targetFps)} onChange={v => setTargetFps(Number(v))} options={TARGET_FPS_OPTIONS_ALL} placeholder="FPS" className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Custom Game Input */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gamepad2 className="size-4 text-steel-400" />
          <span className="text-sm font-semibold text-steel-200">Enter Game Name</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customGame}
            onChange={e => setCustomGame(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && computePrediction(customGame)}
            placeholder="Type any game name..."
            className="flex-1 glass-input"
          />
          <button
            onClick={() => computePrediction(customGame)}
            disabled={!customGame.trim() || predicting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-stone-300 to-stone-400 text-white hover:from-stone-300 hover:to-stone-400 shadow-lg disabled:opacity-50"
          >
            {predicting ? <RefreshCw className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
            Analyze
          </button>
        </div>
      </div>

      {/* Popular Games Grid */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="size-4 text-steel-400" />
          <span className="text-sm font-semibold text-steel-200">Supported Games</span>
          <span className="text-[9px] text-steel-600 ml-1">{POPULAR_GAMES.length} titles</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {POPULAR_GAMES.map(name => {
            const g = GAME_DATABASE[name];
            return (
              <button
                key={name}
                onClick={() => { setCustomGame(name); computePrediction(name); }}
                disabled={predicting}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-xs font-medium transition-all duration-200 ${
                  selectedGame === name
                    ? 'bg-gradient-to-br from-steel-600/40 to-steel-700/40 border border-stone-300/20 text-steel-200 shadow-neo-raised-sm'
                    : 'bg-white/[0.02] border border-white/[0.04] text-steel-400 hover:bg-white/[0.04] hover:border-white/[0.06] hover:text-steel-300'
                }`}
              >
                <GameLogo game={name} size="sm" />
                <div className="text-left min-w-0">
                  <div className="truncate font-semibold">{g?.fullName || name}</div>
                  <div className="text-[8px] text-steel-600 truncate">{g?.engine}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {predicting && (
        <div className="glass-card p-8 text-center">
          <RefreshCw className="size-8 text-stone-300 animate-spin mx-auto mb-3" />
          <p className="text-sm text-steel-400">Running performance analysis for <span className="text-steel-300 font-medium">{selectedGame}</span>...</p>
          <p className="text-[10px] text-steel-600 mt-1">Evaluating hardware, game settings, tweaks, and engine efficiency</p>
        </div>
      )}

      {/* Re-run banner */}
      {settingsChangedSinceResult && result && !predicting && (
        <div className="glass-card p-4 border border-stone-300/20 bg-stone-300/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="size-4 text-stone-300" />
              <span className="text-xs text-steel-300">Settings changed — prediction no longer accurate</span>
            </div>
            <button
              onClick={() => computePrediction(selectedGame, false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-gradient-to-r from-stone-300 to-stone-400 text-white hover:from-stone-300 hover:to-stone-400 shadow-lg"
            >
              <RefreshCw className="size-3" />
              Re-run with new settings
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && !predicting && (
        <div className="space-y-4">
          {/* Main FPS Card */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <GameLogo game={result.game_name} size="lg" />
                <div>
                  <h2 className="text-xl font-bold text-steel-100">{gameDetails?.fullName || result.game_name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-steel-500">{gameDetails?.engine}</span>
                    <span className="text-steel-600">·</span>
                    <span className="text-[9px] text-steel-500">{gameDetails?.genre}</span>
                    <span className="text-steel-600">·</span>
                    <span className="text-[9px] text-steel-500">{gameDetails?.api}</span>
                  </div>
                </div>
              </div>
              {rating && (
                <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${rating.bg} ${rating.color} border`}>
                  {rating.label}
                </div>
              )}
            </div>

            <FPSBar fps={result.estimated_fps} />

            {gameDetails && (
              <p className="text-[10px] text-steel-500 mt-3 leading-relaxed">{gameDetails.description}</p>
            )}

            <div className="mt-4 text-[10px] text-steel-500 font-mono bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
              {result.details}
            </div>

            {/* Settings Summary */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[8px] px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-steel-500">
                {resolution} · {quality} · RT: {rayTracing} · {upscaling}
              </span>
              <span className="text-[8px] px-2 py-1 rounded-md bg-stone-300/10 border border-stone-300/20 text-stone-300">
                Tweak boost: +{Math.round((tweakFactor - 1) * 100)}%
              </span>
            </div>
          </div>

          {/* Bottleneck Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`glass-card p-4 ${result.cpu_bottleneck ? 'border border-stone-300/20' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Cpu className={`size-4 ${result.cpu_bottleneck ? 'text-stone-300' : 'text-steel-400'}`} />
                <span className="text-xs font-semibold text-steel-200">CPU</span>
                {result.cpu_bottleneck ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-stone-300/20 text-stone-300">Bottleneck</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-white/[0.06] text-stone-300">OK</span>
                )}
              </div>
              <p className="text-[10px] text-steel-500">
                {result.cpu_bottleneck ? 'CPU may limit frame rates in CPU-heavy scenes' : 'CPU is sufficient for this game'}
              </p>
            </div>
            <div className={`glass-card p-4 ${result.gpu_bottleneck ? 'border border-stone-300/20' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <Monitor className={`size-4 ${result.gpu_bottleneck ? 'text-stone-300' : 'text-steel-400'}`} />
                <span className="text-xs font-semibold text-steel-200">GPU</span>
                {result.gpu_bottleneck ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-stone-300/20 text-stone-300">Bottleneck</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-white/[0.06] text-stone-300">OK</span>
                )}
              </div>
              <p className="text-[10px] text-steel-500">
                {result.gpu_bottleneck ? 'GPU may struggle with these settings' : 'GPU handles this game well'}
              </p>
            </div>
            <div className={`glass-card p-4 ${!result.ram_sufficient ? 'border border-stone-300/20' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <MemoryStick className={`size-4 ${!result.ram_sufficient ? 'text-stone-300' : 'text-steel-400'}`} />
                <span className="text-xs font-semibold text-steel-200">RAM / VRAM</span>
                {!result.ram_sufficient ? (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-stone-300/20 text-stone-300">Low</span>
                ) : (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-stone-300/10 border border-white/[0.06] text-stone-300">OK</span>
                )}
              </div>
              <p className="text-[10px] text-steel-500">
                {!result.ram_sufficient ? 'Insufficient RAM/VRAM may cause stuttering' : 'RAM and VRAM are sufficient for this game'}
              </p>
            </div>
          </div>

          {/* Scenarios */}
          {gameDetails && (
            <div className="glass-card p-4">
              <button onClick={() => setShowScenarios(!showScenarios)} className="flex items-center gap-2 w-full">
                <Settings2 className="size-4 text-stone-300" />
                <span className="text-sm font-semibold text-steel-200">Performance Scenarios</span>
                <span className="text-[9px] text-steel-600 ml-1">16 presets</span>
                {showScenarios ? <ChevronUp className="size-3.5 text-steel-500 ml-auto" /> : <ChevronDown className="size-3.5 text-steel-500 ml-auto" />}
              </button>
              {showScenarios && (
                <div className="mt-3 space-y-2">
                  {scenarios.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-steel-200">{s.name}</span>
                          <span className="text-[8px] text-steel-600">{s.resolution}</span>
                          <span className="text-[8px] text-steel-600">{s.settings}</span>
                        </div>
                        <p className="text-[9px] text-steel-500 mt-0.5">{s.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[8px] text-steel-600">1% Low: <span className={`${s.onePercentLow >= 60 ? 'text-steel-400' : 'text-stone-300'}`}>{s.onePercentLow}</span></span>
                          <span className="text-[8px] text-steel-600">0.1% Low: <span className={`${s.zeroOneLow >= 30 ? 'text-steel-400' : 'text-stone-300'}`}>{s.zeroOneLow}</span></span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-lg font-bold font-mono ${s.estimatedFps >= 144 ? 'text-stone-300' : s.estimatedFps >= 60 ? 'text-steel-200' : s.estimatedFps >= 30 ? 'text-stone-300' : 'text-red-400'}`}>
                          {s.estimatedFps}
                        </span>
                        <span className="text-[9px] text-steel-600 ml-0.5">FPS</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formula & Methodology */}
          <div className="glass-card p-4">
            <button onClick={() => setShowFormulas(!showFormulas)} className="flex items-center gap-2 w-full">
              <Info className="size-4 text-steel-400" />
              <span className="text-sm font-semibold text-steel-200">Prediction Methodology</span>
              {showFormulas ? <ChevronUp className="size-3.5 text-steel-500 ml-auto" /> : <ChevronDown className="size-3.5 text-steel-500 ml-auto" />}
            </button>
            {showFormulas && (
              <div className="mt-3 space-y-3 text-[10px] text-steel-500 leading-relaxed">
                <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] font-mono">
                  <div className="text-stone-300 font-semibold mb-1">FPS Formula:</div>
                  FPS = 60 × Engine × (CPU×W_cpu + GPU×W_gpu + RAM×W_ram + ST_bonus − VRAM_pen − RAM_pen) × Res × Qual × RT × Upscale × Tweaks
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Hardware Factors</span>
                    <p>CPU min(score/rec,1.5) · GPU min(score/rec,1.5) · RAM min(gb/rec,1.5)</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Settings Factors</span>
                    <p>Res: {resolution}×{RESOLUTION_MULTS[resolution]} · {quality}×{QUALITY_MULTS[quality]} · RT×{RT_MULTS[rayTracing]} · Upscale×{UPSCALING_MULTS[upscaling]}</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Tweak Factor</span>
                    <p>{tweakFactor > 1.0 ? `${tweakFactor.toFixed(2)}x (+${Math.round((tweakFactor - 1) * 100)}% from applied tweaks)` : '1.00x (no tweaks applied)'}</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Weights</span>
                    <p>CPU: {(gameDetails?.cpuWeight || 0) * 100}% · GPU: {(gameDetails?.gpuWeight || 0) * 100}% · RAM: {(gameDetails?.ramWeight || 0) * 100}%</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Engine</span>
                    <p>{gameDetails?.engine}: {gameDetails?.engineEfficiency}x modifier · ST weight: {(gameDetails?.singleThreadWeight || 0) * 100}%</p>
                  </div>
                  <div className="p-2 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                    <span className="text-stone-300 font-semibold">Penalties</span>
                    <p>VRAM: −25% if below {gameDetails?.vramRequired}GB · RAM: −20% if below {gameDetails?.recRam}GB</p>
                  </div>
                </div>
                <p className="text-[9px] text-steel-600">
                  FPS estimates are calculated using physics-based modeling of system hardware, applied tweaks, and game settings.
                  Actual performance may vary ±10% based on driver versions, background processes, and thermal conditions.
                  Estimates are for reference only.
                </p>
              </div>
            )}
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="size-4 text-stone-300" />
                <span className="text-sm font-semibold text-steel-200">Recommendations</span>
              </div>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <CheckCircle className="size-3.5 text-stone-300 shrink-0 mt-0.5" />
                    <span className="text-steel-400">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Accuracy Disclaimer */}
          <div className="text-[9px] text-steel-600 text-center leading-relaxed px-4">
            FPS estimates are calculated using physics-based modeling of system hardware, applied tweaks, and game settings.
            Actual performance may vary ±10% based on driver versions, background processes, and thermal conditions.
            Estimates are for reference only.
          </div>
        </div>
      )}
    </div>
  );
}
