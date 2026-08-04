#pragma once
#include <windows.h>

namespace Impulse {
    bool EmptyWorkingSets();
    bool FlushMemoryLists();
    // Uses NtSetSystemInformation(SystemMemoryListInformation)
    bool ClearStandbyAndModifiedLists();
}
