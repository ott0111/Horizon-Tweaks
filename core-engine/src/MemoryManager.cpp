#include "MemoryManager.h"
#include <vector>
#include <psapi.h>
#include <tlhelp32.h>

#pragma comment(lib, "psapi.lib")

typedef enum _SYSTEM_MEMORY_LIST_COMMAND {
    MemoryCaptureAccessedBits,
    MemoryCaptureAndResetAccessedBits,
    MemoryEmptyWorkingSets,
    MemoryFlushModifiedList,
    MemoryPurgeStandbyList,
    MemoryPurgeLowPriorityStandbyList,
    MemoryCommandMax
} SYSTEM_MEMORY_LIST_COMMAND;

extern "C" NTSTATUS NTAPI NtSetSystemInformation(
    INT SystemInformationClass,
    PVOID SystemInformation,
    ULONG SystemInformationLength
);

#define SystemMemoryListInformation 80

namespace Impulse {
    bool EmptyWorkingSets() {
        HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnap == INVALID_HANDLE_VALUE) return false;
        PROCESSENTRY32W pe = { sizeof(pe) };
        if (Process32FirstW(hSnap, &pe)) {
            do {
                HANDLE hProcess = OpenProcess(PROCESS_SET_QUOTA, FALSE, pe.th32ProcessID);
                if (hProcess) {
                    EmptyWorkingSet(hProcess);
                    CloseHandle(hProcess);
                }
            } while (Process32NextW(hSnap, &pe));
        }
        CloseHandle(hSnap);
        return true;
    }

    bool ClearStandbyAndModifiedLists() {
        SYSTEM_MEMORY_LIST_COMMAND cmd = MemoryPurgeStandbyList;
        NTSTATUS status = NtSetSystemInformation(SystemMemoryListInformation, &cmd, sizeof(cmd));
        if (status != 0) {
            cmd = MemoryFlushModifiedList;
            status = NtSetSystemInformation(SystemMemoryListInformation, &cmd, sizeof(cmd));
        }
        return status == 0;
    }

    bool FlushMemoryLists() {
        EmptyWorkingSets();
        return ClearStandbyAndModifiedLists();
    }
} // namespace Impulse
