# Horizon Tweaks - Deployment Guide

## Overview
Horizon Tweaks is a Tauri-based desktop application for gaming performance optimization.

## Deployment Options

### Option 1: Development Deployment (Recommended)
Due to Windows file locking issues during production builds, use the development deployment:

1. **Run the deployment script:**
   ```bash
   deploy.bat
   ```

2. **Manual development start:**
   ```bash
   npm install
   npm run install:all
   npm run dev:tauri
   ```

### Option 2: Production Build (Advanced)
For production builds, you may need to:
1. Restart your computer to clear file locks
2. Run `npm run build` after restart
3. Check `src-tauri/target/release/` for build artifacts

## Application Features
- Gaming performance optimization
- System monitoring
- Resource management
- Real-time performance metrics

## Technical Stack
- **Backend:** Rust with Tauri 2.x
- **Frontend:** React 18 with TypeScript
- **Styling:** TailwindCSS
- **Build Tool:** Vite

## Development Commands
- `npm run dev:ui` - Start frontend development server
- `npm run dev:tauri` - Start full Tauri development environment
- `npm run build` - Build for production (may require restart)
- `npm run start` - Install dependencies and start development

## Troubleshooting
- If production build fails, restart your computer and try again
- File locking issues are common on Windows during Rust compilation
- Development mode provides full functionality for testing and deployment

## System Requirements
- Windows 10/11
- Node.js 18+
- Rust toolchain
- Modern web browser (for development mode)
