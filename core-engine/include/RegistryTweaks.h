#pragma once
#include <string>

namespace Impulse {
    bool SetDword(const wchar_t* keyPath, const wchar_t* valueName, DWORD value);
    bool DeleteValue(const wchar_t* keyPath, const wchar_t* valueName);
    bool ExportKey(const wchar_t* keyPath, const wchar_t* filePath);
    bool ImportKey(const wchar_t* filePath);
}
