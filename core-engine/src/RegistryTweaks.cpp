#include "RegistryTweaks.h"
#include <windows.h>
#include <fstream>
#include <string>

namespace Impulse {
    bool SetDword(const wchar_t* keyPath, const wchar_t* valueName, DWORD value) {
        HKEY hKey = nullptr;
        LONG res = RegOpenKeyExW(HKEY_LOCAL_MACHINE, keyPath, 0, KEY_WRITE, &hKey);
        if (res != ERROR_SUCCESS) {
            res = RegCreateKeyExW(HKEY_LOCAL_MACHINE, keyPath, 0, nullptr, REG_OPTION_NON_VOLATILE, 
                                KEY_WRITE, nullptr, &hKey, nullptr);
        }
        if (res != ERROR_SUCCESS) return false;
        res = RegSetValueExW(hKey, valueName, 0, REG_DWORD, reinterpret_cast<const BYTE*>(&value), sizeof(value));
        RegCloseKey(hKey);
        return res == ERROR_SUCCESS;
    }

    bool DeleteValue(const wchar_t* keyPath, const wchar_t* valueName) {
        HKEY hKey = nullptr;
        LONG res = RegOpenKeyExW(HKEY_LOCAL_MACHINE, keyPath, 0, KEY_WRITE, &hKey);
        if (res != ERROR_SUCCESS) return false;
        res = RegDeleteValueW(hKey, valueName);
        RegCloseKey(hKey);
        return res == ERROR_SUCCESS;
    }

    bool ExportKey(const wchar_t* keyPath, const wchar_t* filePath) {
        std::wstring cmd = L"reg.exe export \"";
        cmd += keyPath;
        cmd += L"\" \"";
        cmd += filePath;
        cmd += L"\" /y";
        STARTUPINFOW si = { sizeof(si) };
        PROCESS_INFORMATION pi = {};
        BOOL ok = CreateProcessW(nullptr, &cmd[0], nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi);
        if (!ok) return false;
        WaitForSingleObject(pi.hProcess, INFINITE);
        DWORD exitCode = 1;
        GetExitCodeProcess(pi.hProcess, &exitCode);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return exitCode == 0;
    }

    bool ImportKey(const wchar_t* filePath) {
        std::wstring cmd = L"reg.exe import \"";
        cmd += filePath;
        cmd += L"\"";
        STARTUPINFOW si = { sizeof(si) };
        PROCESS_INFORMATION pi = {};
        BOOL ok = CreateProcessW(nullptr, &cmd[0], nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, nullptr, &si, &pi);
        if (!ok) return false;
        WaitForSingleObject(pi.hProcess, INFINITE);
        DWORD exitCode = 1;
        GetExitCodeProcess(pi.hProcess, &exitCode);
        CloseHandle(pi.hProcess);
        CloseHandle(pi.hThread);
        return exitCode == 0;
    }
} // namespace Impulse
