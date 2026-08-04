import { useState, useEffect, useCallback } from 'react';
import { X, Lightbulb } from 'lucide-react';

const FACTS = [
  'Windows 95 was the first version to introduce the Start button and taskbar.',
  'The "Blue Screen of Death" (BSOD) dates back to Windows 3.0 in 1990.',
  'Windows XP\'s default wallpaper "Bliss" is a real photo taken in Sonoma County, California.',
  'Windows 10 is installed on over 1 billion devices worldwide.',
  'The first version of Windows, Windows 1.0, was released in 1985.',
  'Windows 95 installation required 13 floppy disks or a CD-ROM.',
  'Ctrl+Alt+Del was originally a single-key combo on the IBM 3270 PC keyboard.',
  'Windows 98 was the first version to support USB natively.',
  'The Recycle Bin was introduced in Windows 95.',
  'Windows NT 3.1 was the first 32-bit version of Windows.',
  'Windows 2000 was the last NT-based Windows to not include product activation.',
  'Windows Vista was in development for over 5 years.',
  'The Windows key on keyboards was introduced alongside Windows 95.',
  'Windows 7 sold over 100 million copies in its first 6 months.',
  'Windows 8 removed the Start button — it was brought back in 8.1 due to backlash.',
  'Windows 10 was originally codenamed "Threshold".',
  'Windows 11 requires TPM 2.0 and Secure Boot for installation.',
  'The most expensive Windows bug: a $0.50 typo in Windows 3.0\'s code caused major issues.',
  'Windows Media Player was first included with Windows 3.0 with Multimedia Extensions.',
  'Windows Paint hasn\'t changed significantly since Windows 95.',
  'Notepad was first introduced in Windows 1.0 in 1985.',
  'Windows 1.0 required a minimum of 256 KB of RAM and two floppy drives.',
  'Microsoft released Windows 2.0 in 1987 — the first version to support overlapping windows.',
  'Windows 3.0 was the first version to run in protected mode, enabling access to more than 640 KB of RAM.',
  'Windows for Workgroups 3.11 was the first version with built-in networking.',
  'Windows CE was Microsoft\'s operating system for embedded devices and handheld PCs.',
  'Windows 95\'s code name was "Chicago" during development.',
  'Windows 98\'s code name was "Memphis".',
  'Windows Me (Millennium Edition) was the last DOS-based Windows version.',
  'Windows XP had three major updates: SP1, SP2, and SP3.',
  'The "GodMode" folder in Windows is created by naming a folder "GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}".',
  'Windows 10 Pro includes BitLocker encryption, first introduced in Windows Vista.',
  'The Snipping Tool was introduced in Windows 7 and replaced by Snip & Sketch in Windows 10.',
  'Windows PowerShell was first released in 2006 for Windows XP SP2 and Server 2003.',
  'The Windows Registry, introduced in Windows 3.1, replaced .INI files for configuration.',
  'Windows NTFS supports file sizes up to 16 exabytes theoretically.',
  'The Windows clipboard was invented by Charles Simonyi at Microsoft in 1988.',
  'Windows Task Manager (Ctrl+Shift+Esc) was first introduced in Windows NT 4.0.',
  'Windows System Restore was first introduced in Windows Me.',
  'Windows ReadyBoost uses USB flash drives as supplementary memory cache.',
  'Windows SuperFetch (now SysMain) pre-loads frequently used programs into RAM.',
  'Windows BitLocker was first introduced in Windows Vista Enterprise and Ultimate.',
  'Windows DirectStorage was introduced in Windows 11 for faster game loading.',
  'Windows File Explorer was originally called Windows Explorer in Windows 95.',
  'Windows PowerShell replaced the traditional Command Prompt (cmd.exe) for system administration.',
  'Windows 11 Snap Layouts let you arrange multiple windows in predefined grid patterns.',
  'Windows Hyper-V was first available in Windows Server 2008, then brought to Windows 8 Pro.',
  'Windows 10 introduced the Virtual Desktop feature (Task View) in 2015.',
  'Windows Subsystem for Linux (WSL) lets you run Linux binaries natively on Windows.',
  'Windows Windows Update was first automated in Windows 98 with the Windows Update website.',
  'Windows Aero glass transparency was introduced in Windows Vista and removed in Windows 8.',
  'Windows Clipboard History (Win+V) was introduced in Windows 10 version 1809.',
  'Windows Night Light reduces blue light emission from your display for better sleep.',
  'Windows Storage Spaces lets you pool multiple drives into a single logical drive.',
  'Windows AppX package format was introduced alongside Windows 8 Store apps.',
  'Windows Game Mode (Win+G) was introduced in Windows 10 Creators Update.',
  'Windows Focus Assist was introduced in Windows 10 April 2018 Update to reduce notifications.',
  'Windows Windows Hello introduced biometric authentication (face/fingerprint) in Windows 10.',
  'Windows Timeline (Win+Tab) showed your recent activities across devices in Windows 10.',
  'Windows Phone Link was originally called Your Phone and connects your Android to your PC.',
];

const SHOWN_FACTS_KEY = 'windows-facts-shown';

function getTodayFact(): string {
  const dayIndex = new Date().getDate() % FACTS.length;
  return FACTS[dayIndex];
}

export default function WindowsFactsNotification() {
  const [dismissed, setDismissed] = useState(true);
  const [currentFact, setCurrentFact] = useState('');
  const [visible, setVisible] = useState(false);

  const selectFact = useCallback(() => {
    const shown = JSON.parse(localStorage.getItem(SHOWN_FACTS_KEY) || '[]') as number[];
    const available = FACTS.map((_, i) => i).filter(i => !shown.includes(i));
    let idx: number;
    if (available.length === 0) {
      localStorage.removeItem(SHOWN_FACTS_KEY);
      idx = Math.floor(Math.random() * FACTS.length);
    } else {
      idx = available[Math.floor(Math.random() * available.length)];
    }
    localStorage.setItem(SHOWN_FACTS_KEY, JSON.stringify([...shown, idx].slice(-30)));
    return FACTS[idx];
  }, []);

  useEffect(() => {
    const firstDelay = setTimeout(() => {
      setCurrentFact(selectFact());
      setDismissed(false);
      setTimeout(() => setVisible(true), 50);
    }, 8000);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentFact(selectFact());
        setDismissed(false);
        setTimeout(() => setVisible(true), 50);
      }, 400);
    }, 120000);

    return () => {
      clearTimeout(firstDelay);
      clearInterval(interval);
    };
  }, [selectFact]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  };

  if (dismissed) return null;

  return (
    <div
      className={`fixed top-20 right-6 z-[90] max-w-sm transition-all duration-400 ${
        visible
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-8'
      }`}
    >
      <div className="glass-panel p-4 shadow-spatial-lg blue-accent">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-stone-300/10 border border-stone-300/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lightbulb className="size-4 text-stone-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-stone-300 uppercase tracking-wider">Did You Know?</span>
              <button
                onClick={handleDismiss}
                className="size-5 rounded flex items-center justify-center text-steel-600 hover:text-steel-400 hover:bg-white/[0.04] transition-colors"
              >
                <X className="size-3" />
              </button>
            </div>
            <p className="text-[11px] text-steel-300 leading-relaxed">{currentFact}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
