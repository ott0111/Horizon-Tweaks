#pragma once

#ifdef SUMMITCORE_EXPORTS
#define SUMMIT_API extern "C" __declspec(dllexport)
#else
#define SUMMIT_API extern "C" __declspec(dllimport)
#endif

#include <cstdint>

SUMMIT_API bool Summit_Init();
SUMMIT_API void Summit_Shutdown();

SUMMIT_API bool Summit_SetTimerResolution(uint32_t requestedResolutionNs, uint32_t* actualResolutionNs);
SUMMIT_API bool Summit_ClearMemoryLists();
SUMMIT_API bool Summit_AdjustProcessPriority(const wchar_t* processName, int priorityClass);
SUMMIT_API bool Summit_ApplyNetworkTweaks();
SUMMIT_API bool Summit_ApplyMemoryTweaks();
SUMMIT_API bool Summit_ApplyKernelTweaks(); // High risk: disables some mitigations

SUMMIT_API uint64_t Summit_ReadRdtsc();
SUMMIT_API void Summit_CpuidVendor(char outVendor[13]);

SUMMIT_API bool Summit_SnapshotRegistryKey(const wchar_t* keyPath, const wchar_t* outSnapshotPath);
SUMMIT_API bool Summit_RestoreRegistryKey(const wchar_t* snapshotPath);

SUMMIT_API void Summit_GetLastErrorMsg(wchar_t* outBuffer, size_t bufferSize);
