#pragma once
#include <windows.h>
#include <string>

namespace Impulse {
    bool SetProcessPriorityByName(const std::wstring& name, DWORD priorityClass);
    bool TrimWorkingSetByName(const std::wstring& name);
    bool EnableProcessPrivilege(HANDLE hProcess, const wchar_t* privilege);
}
