import { useState } from 'react';
import {
  Book, Cpu, Activity, Wrench, Shield, Gamepad2, Zap,
  Monitor, Wifi, Database, Server, Gauge,
  Globe, Disc, Lock, Terminal, ChevronDown, ChevronRight, AlertTriangle,
  Download, Lock as LockIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getFeaturesByTier } from '../features/FeatureRegistry';

interface DocSection {
  id: string;
  title: string;
  icon: any;
  content: string[];
  minTier: string;
  subsections?: { title: string; content: string[] }[];
}

const SECTIONS: DocSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    icon: Book,
    minTier: 'free',
    content: [
      'Horizon Tweaks is a comprehensive Windows optimization and system monitoring application built with Tauri v2 (Rust backend + React/TypeScript frontend).',
      'The app provides real-time hardware monitoring, system tweaking, game optimization, disk analysis, network tuning, driver management, and privacy management — all running locally with no cloud dependency.',
      'Every operation is executed via PowerShell scripts spawned on demand. The backend is written in Rust for performance and safety, while the frontend uses React with Tailwind CSS for a dark-themed card-based UI.',
    ],
    subsections: [
      {
        title: 'Architecture Overview',
        content: [
          'Frontend (React/TypeScript): Dashboard, TweakCatalog, Benchmark, ProcessManager, Networking, DriverCenter, GamePerformancePredictor, LatencyMonitor, and other components. State managed via React Hooks with lazy loading (Suspense). UI styled with Tailwind CSS and Lucide icons.',
          'Tauri IPC Bridge: Rust ↔ JavaScript communication layer. Handles invoke() commands from frontend and streams real-time events (metrics, monitoring) to the UI.',
          'Backend (Rust/src-tauri): System API commands for power management, tweaks, debloating, BIOS, networking, and driver management. Services include a 1-second polling monitor and the rollback manager. Metrics are published via an event channel.',
          'PowerShell 5.1 (Windows): Executes WMI queries, registry modifications, netsh commands, Get-Counter performance counters, ping, and nvidia-smi. Uses Add-Type for on-the-fly C# compilation in benchmarks.',
          'Data Flow: User interaction → invoke() → Rust command → PowerShell script → stdout/JSON → Rust struct → IPC event → React state → UI render.',
          'All operations are local — no cloud dependency. The Rust backend spawns PowerShell processes on demand and parses structured output.',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    icon: Activity,
    minTier: 'free',
    content: [
      'The Dashboard is the main landing page showing real-time system metrics: CPU usage, memory usage, GPU usage, disk usage, network status, and temperatures.',
      'Metrics are polled every 1 second via a Tauri event channel. GPU utilization is obtained through typeperf (Intel Impulse, AMD) or nvidia-smi (NVIDIA). CPU usage comes from sysinfo crate. Memory and disk stats come from WMI counters.',
      'The Dashboard displays sparkline graphs (60-point rolling history) for CPU, RAM, GPU usage, CPU temperature, and GPU temperature. The GPU details card shows vendor badge, VRAM, driver version, and a live usage bar.',
      'GPU temperature is displayed for NVIDIA GPUs (via nvidia-smi temperature.gpu) and AMD/Intel GPUs (via WMI MSAcpi_ThermalZoneTemperature). Temperature cards are conditionally hidden when not available.',
    ],
    subsections: [
      {
        title: 'Metrics Sources',
        content: [
          'CPU Usage: sysinfo crate / Get-Counter \'\\Processor(_Total)\\% Processor Time\'',
          'Memory Usage: sysinfo crate / WMI Win32_OperatingSystem (FreePhysicalMemory)',
          'GPU Usage: nvidia-smi (NVIDIA), typeperf (Intel/AMD) every 1s',
          'CPU Temperature: Get-WmiObject MSAcpi_ThermalZoneTemperature (Kelvin → Celsius)',
          'GPU Temperature (NVIDIA): nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader',
          'GPU Temperature (AMD/Intel): WMI MSAcpi_ThermalZoneTemperature via PowerShell fallback',
          'Disk Usage: Get-Counter \'\\LogicalDisk(C:)\\% Free Space\'',
          'Network: Get-Counter \'\\Network Interface(*)\\Bytes Total/sec\'',
        ],
      },
      {
        title: 'Health Classification',
        content: [
          'Overall health = cpuScore × 0.35 + ramScore × 0.25 + gpuScore × 0.25 + tempScore × 0.15',
          'Each score = 100 - usage_percent (or temperature for tempScore)',
          'Excellent: ≥80 | Good: 60-79 | Fair: 40-59 | Poor: <40',
        ],
      },
    ],
  },
  {
    id: 'driver-center',
    title: 'Driver Center',
    icon: Download,
    minTier: 'free',
    content: [
      'The Driver Center detects your GPU vendor and provides official download links for the latest drivers from NVIDIA, AMD, and Intel.',
      'Auto-detection uses nvidia-smi (NVIDIA), WMI Win32_VideoController (AMD/Intel), and typeperf wildcards to identify the GPU manufacturer.',
      'Each driver entry shows: current driver version (from nvidia-smi or WMI), latest available version, release date, and a direct download link to the official vendor website.',
    ],
    subsections: [
      {
        title: 'Supported Vendors',
        content: [
          'NVIDIA: GeForce Game Ready drivers via nvidia-smi Driver Version. Download from nvidia.com/drivers. Recommended for: GTX 10-series and newer (GeForce Experience or standalone installer).',
          'AMD: Radeon Software drivers via WMI Win32_VideoController DriverVersion. Download from amd.com/support. Recommended for: RX 400-series and newer (Radeon Software Adrenalin).',
          'Intel: Impulse/Iris/UHD drivers via WMI Win32_VideoController DriverVersion. Download from intel.com/content/www/us/en/download-center. Recommended for: Intel Impulse A-series, Iris Xe, UHD 600+.',
        ],
      },
      {
        title: 'Driver Update Best Practices',
        content: [
          'Always download drivers directly from the vendor website — avoid third-party driver update tools.',
          'Create a system restore point before installing new GPU drivers.',
          'For NVIDIA: Use the "Clean Install" option in the installer to remove old driver remnants.',
          'For AMD: Use DDU (Display Driver Uninstaller) in Safe Mode for a completely clean driver install if experiencing issues.',
          'For Intel: The Intel Driver & Support Assistant (DSA) can automatically detect and install updates.',
          'After updating, restart your system and verify the driver version in Device Manager or the Driver Center.',
        ],
      },
    ],
  },
  {
    id: 'game-predictor',
    title: 'Game Performance Analyzer',
    icon: Gamepad2,
    minTier: 'free',
    content: [
      'The Game Performance Analyzer estimates how well your system can run specific games using a physics-based FPS formula.',
      'The app detects your CPU, GPU, and RAM from the backend (get_system_status_basic, get_gpu_info) and matches them against a database of 15 popular games.',
      'Each game entry shows: estimated FPS, performance rating (Excellent/Good/Playable/Low), bottleneck analysis (CPU/GPU/RAM), and optimization recommendations.',
    ],
    subsections: [
      {
        title: 'FPS Estimation Formula',
        content: [
          'FPS = 60 × (CPU_factor × W_cpu + GPU_factor × W_gpu + RAM_factor × W_ram)',
          'CPU_factor = systemCpuScore / recCpuScore (capped at 1.5×)',
          'GPU_factor = systemGpuScore / recGpuScore (capped at 1.5×)',
          'RAM_factor = systemRamGB / recRamGB (capped at 1.5×)',
          'W_cpu, W_gpu, W_ram are per-game weights reflecting how CPU/GPU/RAM-bound each game is.',
          'Example: Valorant is CPU-heavy (W_cpu=0.5, W_gpu=0.4, W_ram=0.1), while Cyberpunk is GPU-heavy (W_cpu=0.2, W_gpu=0.6, W_ram=0.2).',
        ],
      },
      {
        title: 'Game Database',
        content: [
          '15 games with engine info, genre, recommended specs, and per-game weight factors:',
          'FPS Games: Valorant (Riot), CS2 (Source 2), Fortnite (UE5), Apex Legends (Source), Overwatch 2 (Custom)',
          'Battle Royale: PUBG (Unreal), Warzone (IW 8.0)',
          'Open World: GTA V (RAGE), Cyberpunk 2077 (REDEngine), Red Dead 2 (RAGE)',
          'RPG: Elden Ring (FromSoft), Baldur\'s Gate 3 (Divinity 4.0)',
          'Strategy: Civilization VI (LODX), Starfield (Creation Engine 2)',
          'Other: Minecraft (Java/LWJGL)',
        ],
      },
      {
        title: 'Performance Scenarios',
        content: [
          'The analyzer shows estimated FPS across 6 quality presets for your selected game:',
          'Competitive Low (1080p, lowest settings) — maximum FPS for competitive play',
          'Medium (1080p, medium settings) — balanced quality and performance',
          'High (1080p, high settings) — visual quality prioritized',
          'Ultra (1440p, ultra settings) — high-resolution gaming',
          '4K (2160p, ultra settings) — extreme resolution, requires top-tier hardware',
          'Each scenario applies a resolution scaling factor to the base FPS estimate.',
        ],
      },
    ],
  },
  {
    id: 'tweaks',
    title: 'System Tweaks',
    icon: Wrench,
    minTier: 'basic',
    content: [
      'The General Tweaks and Advanced Tweaks pages provide pre-defined Windows optimization settings organized by category: Performance, Network, Privacy, Services, Explorer, and Gaming.',
      'Each tweak shows its current registry value and the recommended value. Applying a tweak modifies the registry or runs a PowerShell command. Tweaks are tracked in an in-memory HashMap for rollback support.',
    ],
    subsections: [
      {
        title: 'General Tweaks',
        content: [
          'Performance: Visual effects, processor scheduling (Programs/Background), power scheme (High Performance/Ultimate Performance), game mode enable.',
          'Network: TCP auto-tuning, RSS, Chimney offload, NetDMA, ECN, Nagle\'s algorithm, DNS cache flush, Winsock reset.',
          'Privacy: Telemetry disable, Cortana disable, advertising ID removal, location tracking disable, activity history disable.',
          'Services: Windows Search, SysMain (Superfetch), Print Spooler, Windows Update, Windows Defender real-time scanning, Diagnostic services.',
          'Explorer: Show file extensions, hidden files, launch folder windows in separate process, taskbar transparency, snap assist.',
          'Gaming: Game DVR disable, fullscreen optimizations disable, mouse acceleration disable, high DPI scaling override.',
        ],
      },
      {
        title: 'Advanced Tweaks',
        content: [
          'Memory Management: Large System Cache, Memory Compression, Pagefile size/disable, Pool Usage Maximum, Paged/Non-paged pool quotas.',
          'Kernel: NTFS memory usage, I/O priority, IRQ priority, interrupt affinity, CPU priority control, quantum length.',
          'Timer Resolution: HPET disable/enable, TSC synchronization, timer slack, multimedia class scheduler timers.',
          'Network Deep: TCP window auto-tuning level, TCP 1323 timestamps/WSopt, RFC 1323, ECN capability, initial congestion window, Fast TCP.',
          'Disk: Write caching policy, NtfsDisableLastAccessUpdate, NtfsDisable8dot3NameCreation, file system caching.',
        ],
      },
    ],
  },
  {
    id: 'bios',
    title: 'BIOS / UEFI Settings',
    icon: Server,
    minTier: 'ultimate',
    content: [
      'The BIOS page reads system firmware information via WMI and provides access to common BIOS-level settings that can be modified from within Windows.',
      'The page shows a quick stats overview: manufacturer, BIOS version, secure boot status, and virtualization status.',
      'Available settings include: boot order, virtualization (VT-x/AMD-V), secure boot state, power-on behavior, and XMP/profile memory settings.',
      'Each BIOS setting is fetched via individual parallel PowerShell calls (not one heavy script) to prevent freezing the UI. Changes use bcdedit or powercfg depending on the setting type.',
    ],
    subsections: [
      {
        title: 'Readable Settings',
        content: [
          'Virtualization: Enabled/Disabled (via Get-CimInstance Win32_Processor -Property VirtualizationFirmwareEnabled)',
          'Secure Boot: Enabled/Disabled (via Confirm-SecureBootUEFI)',
          'Boot Order: Current boot device list via BcdEdit /enum firmware',
          'XMP Profile: Check via WMI memory speed vs rated speed',
          'BIOS Manufacturer: WMI Win32_BIOS Manufacturer field',
          'BIOS Version: WMI Win32_BIOS SMBIOSBIOSVersion field',
        ],
      },
    ],
  },
  {
    id: 'debloating',
    title: 'Debloating',
    icon: Shield,
    minTier: 'ultimate',
    content: [
      'The Debloating page removes unnecessary Windows components, pre-installed apps, telemetry services, and background processes.',
      'It provides categorized lists of removable packages: AppX packages (Windows Store apps), system services (telemetry, diagnostics), scheduled tasks, OneDrive, Edge features, and Windows Defender components.',
    ],
    subsections: [
      {
        title: 'Categories',
        content: [
          'AppX Packages: Xbox apps (GamingOverlay, GameBar, XboxApp), Microsoft Office Hub, Skype, News, Weather, OneNote, People, Mixed Reality Portal, GetHelp.',
          'System Services: DiagTrack (Connected User Experiences and Telemetry), dmwappushservice, diagnostics hub, WSearch, WMPNetworkSharing.',
          'Scheduled Tasks: Microsoft Compatibility Appraiser, Customer Experience Improvement Program, Consolidator, Proxy, BthSQM.',
          'OneDrive: Remove-OneDrive via uninstall string, folder removal, registry cleanup, shell icon removal.',
          'Edge: Disable Edge sidebar, Copilot, startup boost, background process, search suggestions, shopping, password manager.',
          'Defender: Disable real-time monitoring, cloud-delivered protection, automatic sample submission, PUA protection.',
        ],
      },
    ],
  },
  {
    id: 'networking',
    title: 'Network Optimizer',
    icon: Globe,
    minTier: 'basic',
    content: [
      'The Network Optimizer page provides DNS management, TCP/IP tuning, adapter diagnostics, and network profile switching.',
      'DNS: Switch between Google (8.8.8.8), Cloudflare (1.1.1.1), Quad9 (9.9.9.9), OpenDNS (208.67.222.222), or custom providers via PowerShell Set-DnsClientServerAddress.',
      'TCP Settings: Toggle Auto-Tuning, RSS, Chimney Offload, NetDMA, ECN, Timestamps, and Nagle\'s Algorithm. Each is a netsh int tcp set command.',
      'Quick Actions: Flush DNS cache (ipconfig /flushdns), Reset Winsock (netsh winsock reset), TCP Optimize (applies recommended settings). Network Profile switches between Public/Private (Set-NetConnectionProfile).',
    ],
    subsections: [
      {
        title: 'DNS Providers',
        content: [
          'Cloudflare: 1.1.1.1 / 1.0.0.1 — Fastest, privacy-first, no logs',
          'Google: 8.8.8.8 / 8.8.4.4 — Reliable, widely deployed',
          'Quad9: 9.9.9.9 — Malware-blocking, threat intelligence',
          'OpenDNS: 208.67.222.222 / 208.67.220.220 — Content filtering',
        ],
      },
      {
        title: 'TCP Settings Reference',
        content: [
          'Auto-Tuning: netsh int tcp set global autotuninglevel=normal (default) or disabled. Normal = receive window auto-scaled up to 64MB. Disabled = fixed 64KB window (may reduce throughput on high-latency links).',
          'RSS (Receive Side Scaling): netsh int tcp set global rss=enabled. Distributes NIC processing across CPU cores. Disable on single-core or very low-latency workloads.',
          'Chimney Offload: netsh int tcp set global chimney=disabled. Offloads TCP processing to NIC. Often incompatible with VPNs or virtualization; recommended disabled.',
          'NetDMA: netsh int tcp set global netdma=disabled. Direct memory access for network data. Can cause issues with modern storage drivers.',
          'ECN: netsh int tcp set global ecncapability=enabled. Explicit Congestion Notification. Helps avoid packet drops on congested links.',
        ],
      },
    ],
  },
  {
    id: 'game-profiles',
    title: 'Game Profiles',
    icon: Gamepad2,
    minTier: 'basic',
    content: [
      'The Game Profiles page auto-detects installed games from multiple sources and applies performance optimizations per title.',
      'Detection sources: Steam libraryfolders.vdf, Epic Games LauncherInstalled.dat, Battle.net directory, GOG Galaxy, Windows Registry (Uninstall keys with game keywords), and D:\\Aayan\\ or D:\\Games\\ folders.',
      'Each game has curated optimal settings: CPU priority (High/Normal), GPU priority, Fullscreen optimizations toggle, High DPI awareness, and Game DVR disable. "Activate Game Profile" applies power scheme + registry tweaks.',
    ],
    subsections: [
      {
        title: 'Per-Game Settings',
        content: [
          'CPU Priority: High = process priority class HIGH_PRIORITY_CLASS (reduces other background processes). Use for competitive games (CS2, Valorant, Fortnite).',
          'GPU Priority: High = enables GPU priority scheduling (Windows 11 22H2+). Reduces micro-stutter on shared GPU workloads.',
          'Fullscreen Optimizations: Disable = forces true exclusive fullscreen. Can reduce input lag in older DX9/DX10 titles.',
          'High DPI Aware: Enable = app is DPI-aware; avoids blurry rendering on high-DPI monitors. Disable = system handles DPI scaling.',
          'Game DVR: Disable = turns off Xbox Game Bar background recording. Frees GPU encoder resources.',
        ],
      },
    ],
  },
  {
    id: 'latency-monitor',
    title: 'Latency Monitor',
    icon: Activity,
    minTier: 'basic',
    content: [
      'The Latency Monitor supports both single-shot ping tests and continuous ping mode with real-time statistics.',
      'Single-shot mode: Sends 10 ICMP packets to a target host and displays average latency, packet loss, min/max/avg timing, and jitter.',
      'Continuous mode: Runs an ongoing ping stream with live updating stats including P95/P99 percentiles, quality tier badges, and a scrolling ping history.',
      'Game server presets: Pre-configured targets for popular games (Valorant NA, CS2, Fortnite, Apex Legends, LoL, Overwatch 2, Warzone, Minecraft) to test your connection to actual game servers.',
    ],
    subsections: [
      {
        title: 'Quality Tiers',
        content: [
          '<30ms: Excellent — Suitable for competitive gaming (CS2, Valorant, Apex), real-time voice, video calls',
          '30-80ms: Good — Fine for streaming, casual gaming, browsing, video conferencing',
          '80-150ms: Fair — Acceptable for web browsing, video streaming; noticeable lag in gaming',
          '>150ms: Poor — Voice lag, video buffering, gaming is difficult; check WiFi interference or ISP throttling',
        ],
      },
      {
        title: 'Gaming Suitability Rating',
        content: [
          'Esports Ready (<20ms avg, <3ms jitter): Optimal for competitive FPS (Valorant, CS2, Apex)',
          'Competitive Ready (<40ms avg, <8ms jitter): Suitable for ranked play in most titles',
          'Casual Friendly (<80ms avg, <15ms jitter): Fine for casual and story-driven games',
          'Acceptable (<120ms avg): Playable but noticeable delay; avoid competitive modes',
          'Poor (>150ms avg): Significant lag; consider wired connection or contacting ISP',
          'Unplayable (>250ms avg): Severe rubber-banding and input delay; investigate network issues',
        ],
      },
      {
        title: 'Percentile Statistics',
        content: [
          'P50 (Median): The middle value — half of pings are below this. Most representative of typical latency.',
          'P95: 95th percentile — only 5% of pings exceed this. Important for competitive gaming.',
          'P99: 99th percentile — captures worst-case spikes. High P99 with low average indicates intermittent issues.',
          'Jitter: Standard deviation of ping times. Low jitter (<5ms) = stable; High jitter (>15ms) = congested.',
        ],
      },
    ],
  },
  {
    id: 'process-manager',
    title: 'Process Manager',
    icon: Cpu,
    minTier: 'basic',
    content: [
      'The Process Manager displays all running processes with real-time CPU and memory usage, updated every 2 seconds.',
      'CPU % comes from Get-Counter \'\\Process(*)\\% Processor Time\' divided by logical core count (0-100% scale). Memory is WorkingSet64 from Get-Process. Status reflects the Responding property.',
      'Actions: Kill (Stop-Process -Force), Suspend ($process.Suspend()), Resume ($process.Resume()). Processes are searchable and sortable by name, CPU, or memory with ascending/descending toggle.',
    ],
    subsections: [
      {
        title: 'CPU Counter Details',
        content: [
          'Get-Counter returns cooked values that are normalized across all CPU time. Dividing by core count gives 0-100% usage per core.',
          'The process name in the counter has #N suffix for multiple instances (e.g., chrome#1, chrome#2). These get merged back to the base process name.',
          'Idle and _total entries are skipped. Unknown process names (not in counter) display 0% CPU.',
        ],
      },
    ],
  },
  {
    id: 'startup-manager',
    title: 'Startup Manager',
    icon: Zap,
    minTier: 'basic',
    content: [
      'The Startup Manager lists programs that launch at Windows startup and allows enabling/disabling them.',
      'Sources: Registry Run keys (HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run, HKCU equivalent), Startup folder (shell:startup), and Task Scheduler startup triggers.',
    ],
    subsections: [
      {
        title: 'Impact Rating',
        content: [
          'Low: <1MB memory, <50ms startup delay (e.g., hotkey utilities, tray icons)',
          'Medium: 1-10MB, 50-200ms delay (e.g., cloud sync clients, updaters)',
          'High: >10MB, >200ms delay (e.g., browser startup boost, antivirus, Creative Cloud)',
        ],
      },
    ],
  },
  {
    id: 'disk-analyzer',
    title: 'Disk Analyzer',
    icon: Disc,
    minTier: 'basic',
    content: [
      'The Disk Analyzer scans drives and directories to visualize storage usage and identify space hogs.',
      'Drive overview shows total/used/free space with a color-coded usage bar (>90% red, >70% yellow, else steel). Click a drive to scan its top-level folders sorted by size.',
      'Drive type detection uses multiple methods: Win32_DiskDrive Capability check (non-rotational = SSD), model name regex matching (NVMe, M.2, SSD brands like Samsung, WD, Crucial), and MediaType fallback.',
      'Folder scanning uses Get-ChildItem -Recurse to sum file sizes. File type breakdown classifies by extension: Documents (.doc,.pdf,.txt), Images (.jpg,.png), Videos (.mp4,.mkv), Music (.mp3,.flac).',
    ],
    subsections: [
      {
        title: 'SSD Detection Logic',
        content: [
          'Primary: Win32_DiskDrive Capability array contains 3 (Non-rotational) → definitively an SSD',
          'Secondary: Model name regex matches NVMe, M.2 PCIe, PCIe Gen, or known SSD brands (Samsung, WD, Crucial, Kingston, Intel, SK Hynix, SanDisk, Seagate, Lexar, TeamGroup)',
          'Fallback: MediaType property = "Fixed hard disk media" → HDD, or model contains "Virtual" → Virtual disk',
          'Note: Some NVMe drives report incorrect MediaType. The Capability and model name checks are more reliable.',
        ],
      },
      {
        title: 'Scan Performance',
        content: [
          'Root drive scan (C:\\) aggregates all files in a single recursive pass using a hash table of directory → size mappings.',
          'System directories ($Recycle.Bin, System Volume Information) are automatically excluded.',
          'Child directory sizes are propagated upward in sorted order, enabling O(N + D log D) performance instead of O(N * D).',
          'Large folders (>100K files) may still take 10-30s on HDDs; NVMe drives typically complete in under 5s.',
        ],
      },
      {
        title: 'File Type Classification',
        content: [
          'Documents: .doc, .docx, .pdf, .xls, .xlsx, .ppt, .pptx, .txt, .md, .rtf',
          'Images: .jpg, .jpeg, .png, .gif, .bmp, .webp, .svg',
          'Videos: .mp4, .avi, .mkv, .mov, .wmv, .flv',
          'Music: .mp3, .flac, .wav, .aac, .ogg, .wma',
          'Other: Everything else not matching above',
        ],
      },
    ],
  },
  {
    id: 'benchmark',
    title: 'Benchmark',
    icon: Gauge,
    minTier: 'pro',
    content: [
      'The Benchmark page runs CPU, memory, disk, and compression performance tests with meaningful real-world metrics using compiled .NET code (Add-Type C#) for accurate hardware measurement.',
      'Each test runs independently and scores are normalized to a 0-100K point scale. Overall grade is determined by total score with letter ratings from S+ (90K+) to F (<10K).',
    ],
    subsections: [
      {
        title: 'CPU Benchmark (C# via Add-Type)',
        content: [
          'Four sub-tests run sequentially, each timed with System.Diagnostics.Stopwatch:',
          '1. Single-core prime sieve up to 500,000: Measures integer throughput (IPC). Score = primes/ms × 100 (capped at 30K).',
          '2. SHA-256 throughput: 10,000 iterations × 4KB data blocks. Measures cryptographic instruction throughput. Score = MB/s × 200 (capped at 20K).',
          '3. Multi-core parallel prime sieve using System.Threading.Threads: All logical cores work simultaneously on chunks of 500,000 range. Score = primes/ms × cores × 10 (capped at 35K). The speedup factor (single time / parallel time) shows scaling efficiency.',
          '4. Matrix multiply 200×200: Double-precision FP performance. Measures 2*N^3 floating point ops. Score = GFLOPS × 5000 (capped at 15K).',
          'Total score (0-100K) = singleScore + shaScore + parallelScore + fpScore.',
          'Score targets: >60K = i9-14900K/Ryzen 9, 30-60K = i7/Ryzen 7, 15-30K = i5/Ryzen 5, 7-15K = i3/Ryzen 3.',
        ],
      },
      {
        title: 'Memory Benchmark (C# via Add-Type)',
        content: [
          'Four sub-tests on a 256MB buffer:',
          '1. Copy bandwidth: Buffer.BlockCopy on 256MB arrays — measures real throughput through all cache levels.',
          '2. Write bandwidth: Strided write (every 64th byte) to 256MB array — measures write path.',
          '3. Read bandwidth: Strided read with accumulating sum — measures read path.',
          '4. Random access latency: Pointer chase on a 2GB (8M entries × 4 bytes) linked-list array for 500K iterations.',
          'Total score = avgBandwidthGBps × 500 + latency bonus (up to 3000 - latency*0.3, min 0).',
          'Targets: >30K = DDR5-7200+, 15-30K = DDR5-6000, 8-15K = DDR5-4800/DDR4-3600, 4-8K = DDR4-3200.',
        ],
      },
      {
        title: 'Disk Benchmark',
        content: [
          '50MB test file created on the target drive:',
          'Write: [IO.File]::WriteAllBytes sequential write, measured in MB/s.',
          'Read: [IO.File]::ReadAllBytes sequential read, measured in MB/s.',
          'Score = writeMBps + readMBps. Targets: >5000 = NVMe 4.0/5.0, 2500-5000 = NVMe 3.0, 800-2500 = SATA SSD, <800 = HDD.',
        ],
      },
      {
        title: 'Compression Benchmark (C# via Add-Type)',
        content: [
          '100MB of compressible data (byte pattern) processed through GZip/Deflate:',
          'Compress: GZipStream with CompressionLevel.Fastest — tests integer throughput + memory bandwidth.',
          'Decompress: Inflate the compressed stream — tests decompression throughput.',
          'Score = (compressMBps + decompressMBps) × 50. Targets: >5000 = excellent, 3000-5000 = good, 1500-3000 = average.',
        ],
      },
      {
        title: 'Grade Scale',
        content: [
          'S+: 90,000+ — Extreme performance (i9-14900K + DDR5-7200 + NVMe 5.0)',
          'S: 80,000-89,999 — Enthusiast tier (i9-13900K / Ryzen 9 7950X)',
          'A: 60,000-79,999 — High-end (i7-13700K / Ryzen 7 7700X)',
          'B: 40,000-59,999 — Mid-range (i5-13600K / Ryzen 5 7600X)',
          'C: 25,000-39,999 — Entry-level gaming (i5-12400 / Ryzen 5 5600)',
          'D: 10,000-24,999 — Budget (i3-12100 / Ryzen 3 5300G)',
          'F: <10,000 — Below minimum recommended specs',
        ],
      },
    ],
  },
  {
    id: 'game-booster',
    title: 'Game Booster',
    icon: Zap,
    minTier: 'basic',
    content: [
      'Game Booster frees system resources by killing non-essential background processes before launching games.',
      'It calls get_processes (same as Process Manager) and filters against a killable keywords list (110+ entries: browsers, office apps, chat, antivirus, media players, updaters).',
      'The "Activate Game Mode" button kills all selected processes and tracks total memory freed this session.',
    ],
  },
  {
    id: 'wifi-analyzer',
    title: 'Wi-Fi Analyzer',
    icon: Wifi,
    minTier: 'basic',
    content: [
      'The Wi-Fi Analyzer scans nearby wireless networks using netsh wlan show networks mode=Bssid.',
      'For each network, it displays: SSID, signal strength (%), channel number, security type (WPA2, WEP, Open), and BSSID (router MAC address).',
    ],
    subsections: [
      {
        title: 'Signal Strength Reference',
        content: [
          '>80%: Excellent signal; max throughput, stable connection',
          '60-80%: Good signal; slight throughput reduction',
          '40-60%: Fair; moderate throughput, occasional latency',
          '20-40%: Weak; low throughput, frequent disconnects risk',
          '<20%: Very weak; connection may be unreliable or impossible',
        ],
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Dashboard',
    icon: Lock,
    minTier: 'basic',
    content: [
      'The Privacy Dashboard monitors and controls Windows privacy settings related to telemetry, location, camera, microphone, and advertising ID.',
      'Each setting shows current status (Enabled/Disabled) with a one-click toggle. Changes are applied via registry modifications.',
    ],
    subsections: [
      {
        title: 'Controlled Settings',
        content: [
          'Telemetry: HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection\\AllowTelemetry (0 = Security, 1 = Basic, 3 = Full)',
          'Location: CapabilityAccessManager\\ConsentStore\\Location\\Value',
          'Camera: CapabilityAccessManager\\ConsentStore\\Camera\\Value',
          'Microphone: CapabilityAccessManager\\ConsentStore\\Microphone\\Value',
          'Advertising ID: HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo\\Enabled',
          'Activity History: HKLM\\SOFTWARE\\Policies\\Microsoft\\Windows\\System\\EnableActivityFeed',
        ],
      },
    ],
  },
  {
    id: 'display',
    title: 'Display Info',
    icon: Monitor,
    minTier: 'basic',
    content: [
      'The Display Info page shows detailed monitor specifications using WMI queries (WmiMonitorBasicDisplayParams, WmiMonitorID, Win32_VideoController).',
      'Per-monitor data: Name (from EDID), Resolution, Refresh Rate (Hz), Bit Depth, HDR support, and GPU adapter name.',
    ],
  },
  {
    id: 'utilities',
    title: 'System Utilities',
    icon: Terminal,
    minTier: 'free',
    content: [
      'The System Utilities page provides one-click access to 50+ Windows diagnostic and repair tools organized by category.',
    ],
    subsections: [
      {
        title: 'Utility Categories',
        content: [
          'System Repair: SFC Scannow, DISM Restore Health, Check Disk, Disk Cleanup',
          'Network: Flush DNS, Reset Winsock, Reset TCP/IP, Release/Renew IP, Ping, Traceroute, PathPing, DNS Cache, Route Table, WiFi diagnostics',
          'Power: Energy Report, Battery Report, Hibernate toggle, Power Schemes, Sleep Study, Last Wake Source, Wake-enabled Devices',
          'System Info: System Info, Driver List, Running Processes, Network Connections, WMI OS/CPU/Memory/Disk/GPU, Uptime, Startup, Services, Event Log Errors, Firewall',
          'Maintenance: GPUPDATE, Drive Optimization, Shadow Copies, BCDEdit, File System Info, Temp Files, Registry Backup, Wipe Free Space',
        ],
      },
    ],
  },
  {
    id: 'rollback',
    title: 'Rollback Panel',
    icon: Database,
    minTier: 'ultimate',
    content: [
      'The Rollback Panel tracks all tweaks and optimizations applied during the session and provides a centralized undo mechanism.',
      'Each applied tweak is recorded with its original registry value. The panel shows: tweak name, category, timestamp, and current state (Active / Reverted).',
    ],
  },
  {
    id: 'recovery',
    title: 'Recovery & Safety',
    icon: AlertTriangle,
    minTier: 'free',
    content: [
      'Horizon Tweaks is designed with safety as a priority. All tweaks are tracked and fully reversible through the Rollback Manager. Below are detailed steps for handling crashes, unapplying tweaks, restoring snapshots, and resetting to defaults.',
    ],
    subsections: [
      {
        title: 'If the App Fails or Crashes',
        content: [
          'The app runs entirely locally with no cloud dependency. A crash in the UI does not affect applied tweaks — they remain in effect in Windows.',
          'To restart after a crash, simply relaunch Horizon Tweaks. The Rollback Panel will show all tweaks applied in the previous session (tracked in-memory).',
          'If the app fails to start, check the Rust backend logs at %APPDATA%/Impulse-Tweaks/logs.',
          'You can also manually inspect applied registry changes at the modified policies under HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion.',
        ],
      },
      {
        title: 'How to Safely Unapply All Tweaks',
        content: [
          'Open the Rollback Panel from the sidebar or navigation menu.',
          'Each applied tweak is listed with its original registry value and current state (Active / Reverted).',
          'Click "Revert" next to an individual tweak to restore its original value immediately.',
          'Click "Revert All" at the top of the Rollback Panel to restore every tweak applied this session in one action.',
          'All changes are immediate — no reboot required for registry-based tweaks.',
        ],
      },
      {
        title: 'Using the Rollback Manager to Restore Snapshots',
        content: [
          'The Rollback Manager automatically records every change made during a session, including: registry modifications, service state changes, and PowerShell commands executed.',
          'Each entry stores: tweak name, category, timestamp, original value, and new value.',
          'To restore: navigate to Rollback Panel, locate the desired tweak, and click "Revert". The original value is written back to the registry or system.',
          'For batch restoration, use "Revert All" to undo all tweaks from the current session at once.',
          'The Rollback Manager supports per-category filtering and search to quickly find specific tweaks.',
        ],
      },
      {
        title: 'How to Reset Everything to Windows Defaults',
        content: [
          'While Horizon Tweaks does not perform a full Windows reset, you can restore all modified settings to their defaults:',
          'In the Rollback Panel, click "Revert All" to undo every tweak applied via Horizon Tweaks.',
          'For network settings: run netsh int ip reset and netsh winsock reset from an Administrator PowerShell.',
          'For power settings: run powercfg -restoredefaultschemes to reset all power plans to Windows defaults.',
          'For services: run sfc /scannow and DISM /Online /Cleanup-Image /RestoreHealth to repair system files.',
          'For a complete reset of all Windows settings to factory defaults, use Windows Settings > Update & Security > Recovery > Reset this PC.',
        ],
      },
      {
        title: 'All Changes Are Reversible via Rollback',
        content: [
          'Every tweak in Horizon Tweaks is designed to be reversible. The Rollback Manager stores the original value before any change is applied.',
          'Registry tweaks: The original registry value is saved and can be written back at any time.',
          'Service tweaks: Original service state (Running / Stopped) and startup type (Automatic / Manual / Disabled) are recorded.',
          'Power scheme changes: The previous active power scheme GUID is saved for restoration.',
          'Network changes: DNS server addresses and TCP settings are backed up before modification.',
          'There is no permanent or irreversible change in Horizon Tweaks. If you ever encounter an issue, use the Rollback Panel to restore immediately.',
        ],
      },
    ],
  },
];

export default function Documentation() {
  const { tier } = useAuth();
  const userTier = tier || 'free';
  const [openSection, setOpenSection] = useState<string | null>('overview');
  const [openSubs, setOpenSubs] = useState<Record<string, boolean>>({});

  const tierOrder = ['free', 'basic', 'pro', 'ultimate', 'admin'];
  const userIdx = tierOrder.indexOf(userTier);

  const accessibleSections = SECTIONS.filter(s => {
    const minIdx = tierOrder.indexOf(s.minTier);
    return userIdx >= minIdx;
  });

  const lockedSections = SECTIONS.filter(s => {
    const minIdx = tierOrder.indexOf(s.minTier);
    return userIdx < minIdx;
  });

  const hasLockedDocs = lockedSections.length > 0;

  const toggleSub = (key: string) => {
    setOpenSubs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const subKey = (sectionId: string, idx: number) => `${sectionId}-sub-${idx}`;

  const isCodeContent = (line: string) =>
    /[\\\/]|HK[LMCU]|netsh|powercfg|Get-|Set-|\.exe|ipconfig|bcdedit|typeperf|nvidia-smi|wlan|\$\w+|Add-Type|Stop-|Suspend|Resume|%[A-Z_]+%/.test(line);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/[0.04]">
          <Book className="h-6 w-6 text-steel-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-steel-100">Documentation</h1>
          <p className="text-xs text-steel-400 mt-0.5">Complete reference for all features, architecture, and metrics</p>
        </div>
      </div>

      {hasLockedDocs && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-stone-300/10 border border-stone-300/20 text-stone-200 text-xs">
          <LockIcon className="size-3.5 shrink-0" />
          <span>Showing documentation for your current tier (<strong className="capitalize">{userTier}</strong>). Upgrade to see more.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        <div className="glass-panel p-2 space-y-0.5 h-fit sticky top-0">
          {accessibleSections.map(s => (
            <button
              key={s.id}
              onClick={() => setOpenSection(openSection === s.id ? null : s.id)}
              className={`flex items-center gap-2 w-full px-2.5 py-2 text-xs text-left rounded-lg transition-all duration-200 ${
                openSection === s.id
                  ? 'bg-white/[0.06] text-steel-200 border-l-2 border-steel-400/50'
                  : 'text-steel-500 hover:text-steel-200 hover:bg-white/[0.03]'
              }`}
            >
              <s.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {accessibleSections.map(s => {
            const Icon = s.icon;
            const isOpen = openSection === s.id;
            return (
              <div key={s.id} className="glass-panel overflow-hidden">
                <button
                  onClick={() => setOpenSection(isOpen ? null : s.id)}
                  className="flex items-center gap-3 w-full px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] shrink-0">
                    <Icon className="h-5 w-5 text-steel-300" />
                  </div>
                  <span className="text-sm font-semibold text-steel-100 flex-1">{s.title}</span>
                  <div className="relative h-4 w-4">
                    <ChevronDown className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
                    <ChevronRight className={`absolute inset-0 transition-all duration-300 ${isOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 space-y-3">
                    {s.content.map((p, i) => (
                      <p key={i} className="text-xs text-steel-400 leading-relaxed">{p}</p>
                    ))}
                    {s.subsections?.map((sub, i) => {
                      const isSubOpen = openSubs[subKey(s.id, i)] ?? true;
                      return (
                        <div key={i} className="glass-card overflow-hidden">
                          <button
                            onClick={() => toggleSub(subKey(s.id, i))}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
                          >
                            <span className="text-xs font-semibold text-steel-200 flex-1">{sub.title}</span>
                            <div className="relative h-3.5 w-3.5">
                              <ChevronDown className={`absolute inset-0 transition-all duration-300 ${isSubOpen ? 'opacity-100 rotate-0' : 'opacity-0 rotate-90'}`} />
                              <ChevronRight className={`absolute inset-0 transition-all duration-300 ${isSubOpen ? 'opacity-0 -rotate-90' : 'opacity-100 rotate-0'}`} />
                            </div>
                          </button>
                          {isSubOpen && (
                            <div className="px-4 pb-3 space-y-1.5">
                              {sub.content.map((line, j) => (
                                <li key={j} className="text-[11px] text-steel-400 leading-relaxed list-none flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 bg-steel-500 rounded-full mt-[5px] shrink-0" />
                                  <span className={isCodeContent(line) ? 'font-mono' : ''}>{line}</span>
                                </li>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
