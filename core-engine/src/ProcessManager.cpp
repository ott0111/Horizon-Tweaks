#include "ProcessManager.h"
#include <tlhelp32.h>
#include <psapi.h>

namespace Impulse {
    bool SetProcessPriorityByName(const std::wstring& name, DWORD priorityClass) {
        HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnap == INVALID_HANDLE_VALUE) return false;
        PROCESSENTRY32W pe = { sizeof(pe) };
        bool ok = false;
        if (Process32FirstW(hSnap, &pe)) {
            do {
                if (_wcsicmp(pe.szExeFile, name.c_str()) == 0) {
                    HANDLE hProcess = OpenProcess(PROCESS_SET_INFORMATION, FALSE, pe.th32ProcessID);
                    if (hProcess) {
                        if (SetPriorityClass(hProcess, priorityClass)) ok = true;
                        CloseHandle(hProcess);
                    }
                }
            } while (Process32NextW(hSnap, &pe));
        }
        CloseHandle(hSnap);
        return ok;
    }

    bool TrimWorkingSetByName(const std::wstring& name) {
        HANDLE hSnap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (hSnap == INVALID_HANDLE_VALUE) return false;
        PROCESSENTRY32W pe = { sizeof(pe) };
        bool ok = false;
        if (Process32FirstW(hSnap, &pe)) {
            do {
                if (_wcsicmp(pe.szExeFile, name.c_str()) == 0) {
                    HANDLE hProcess = OpenProcess(PROCESS_SET_QUOTA, FALSE, pe.th32ProcessID);
                    if (hProcess) {
                        if (EmptyWorkingSet(hProcess)) ok = true;
                        CloseHandle(hProcess);
                    }
                }
            } while (Process32NextW(hSnap, &pe));
        }
        CloseHandle(hSnap);
        return ok;
    }

    bool EnableProcessPrivilege(HANDLE hToken, const wchar_t* privilege) {
        TOKEN_PRIVILEGES tp = {};
        LUID luid = {};
        if (!LookupPrivilegeValueW(nullptr, privilege, &luid)) return false;
        tp.PrivilegeCount = 1;
        tp.Privileges[0].Luid = luid;
        tp.Privileges[0].Attributes = SE_PRIVILEGE_ENABLED;
        return AdjustTokenPrivileges(hToken, FALSE, &tp, sizeof(tp), nullptr, nullptr) &&
               GetLastError() == ERROR_SUCCESS;
    }
} // namespace Impulse
