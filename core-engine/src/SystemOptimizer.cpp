#include "SystemOptimizer.h"
#include "ProcessManager.h"
#include "MemoryManager.h"
#include "RegistryTweaks.h"
#include <windows.h>
#include <string>

// NtSetTimerResolution
extern "C" NTSTATUS NTAPI NtSetTimerResolution(
    ULONG DesiredResolution,
    BOOLEAN SetResolution,
    PULONG CurrentResolution
);

void SetLastErrorMsg(const wchar_t* msg); // Defined in dllmain.cpp

SUMMIT_API bool Summit_SetTimerResolution(uint32_t requestedResolutionNs, uint32_t* actualResolutionNs) {
    ULONG actual = 0;
    NTSTATUS status = NtSetTimerResolution(requestedResolutionNs, TRUE, &actual);
    if (actualResolutionNs) *actualResolutionNs = actual;
    if (status != 0) {
        SetLastErrorMsg(L"NtSetTimerResolution failed");
        return false;
    }
    return true;
}

SUMMIT_API bool Summit_ClearMemoryLists() {
    bool ok = Impulse::FlushMemoryLists();
    if (!ok) SetLastErrorMsg(L"FlushMemoryLists failed");
    return ok;
}

SUMMIT_API bool Summit_AdjustProcessPriority(const wchar_t* processName, int priorityClass) {
    bool ok = Impulse::SetProcessPriorityByName(processName, static_cast<DWORD>(priorityClass));
    if (!ok) SetLastErrorMsg(L"AdjustProcessPriority failed");
    return ok;
}

SUMMIT_API bool Summit_ApplyNetworkTweaks() {
    bool ok = true;
    // TCP ACK frequency gaming tweak
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces", L"TcpAckFrequency", 1);
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters", L"TCPNoDelay", 1);
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters", L"DefaultTTL", 64);
    
    // Disable Nagle broadly
    HKEY hKey = nullptr;
    if (RegOpenKeyExW(HKEY_LOCAL_MACHINE, L"SOFTWARE\\Microsoft\\MSMQ\\Parameters", 0, KEY_WRITE, &hKey) == ERROR_SUCCESS) {
        DWORD v = 1;
        RegSetValueExW(hKey, L"TCPNoDelay", 0, REG_DWORD, (BYTE*)&v, sizeof(v));
        RegCloseKey(hKey);
    }

    if (!ok) SetLastErrorMsg(L"One or more network tweaks failed");
    return ok;
}

SUMMIT_API bool Summit_ApplyMemoryTweaks() {
    bool ok = true;
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management", L"LargeSystemCache", 0);
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management", L"DisablePagingExecutive", 1);
    if (!ok) SetLastErrorMsg(L"Memory tweak failed");
    return ok;
}

SUMMIT_API bool Summit_ApplyKernelTweaks() {
    // HIGH RISK: disables Meltdown/Spectre mitigations for raw performance
    bool ok = true;
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management", L"FeatureSettingsOverride", 3);
    ok &= Impulse::SetDword(L"SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Memory Management", L"FeatureSettingsOverrideMask", 3);
    if (!ok) SetLastErrorMsg(L"Kernel tweak failed");
    return ok;
}

SUMMIT_API bool Summit_SnapshotRegistryKey(const wchar_t* keyPath, const wchar_t* outSnapshotPath) {
    bool ok = Impulse::ExportKey(keyPath, outSnapshotPath);
    if (!ok) SetLastErrorMsg(L"Snapshot export failed");
    return ok;
}

SUMMIT_API bool Summit_RestoreRegistryKey(const wchar_t* snapshotPath) {
    bool ok = Impulse::ImportKey(snapshotPath);
    if (!ok) SetLastErrorMsg(L"Restore import failed");
    return ok;
}
