#include <windows.h>
#include "SystemOptimizer.h"

static wchar_t g_lastError[512] = {};

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved) {
    switch (reason) {
        case DLL_PROCESS_ATTACH:
            DisableThreadLibraryCalls(hModule);
            break;
    }
    return TRUE;
}

void SetLastErrorMsg(const wchar_t* msg) {
    wcsncpy_s(g_lastError, msg, _TRUNCATE);
}

SUMMIT_API bool Summit_Init() {
    SetLastErrorMsg(L"OK");
    return true;
}

SUMMIT_API void Summit_Shutdown() {
    // Cleanup if needed
}

SUMMIT_API void Summit_GetLastErrorMsg(wchar_t* outBuffer, size_t bufferSize) {
    wcsncpy_s(outBuffer, bufferSize, g_lastError, _TRUNCATE);
}
