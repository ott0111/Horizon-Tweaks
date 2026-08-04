#include "Timing.h"
#include "SystemOptimizer.h"

// For non-MSVC or when asm file is not used, provide intrinsics fallback
#if !defined(_MSC_VER) || defined(SUMMIT_NO_MASM)
#include <intrin.h>
uint64_t Summit_ReadRdtsc() { return __rdtsc(); }
void Summit_CpuidVendor(char outVendor[13]) {
    int regs[4];
    __cpuid(regs, 0);
    *(int*)&outVendor[0] = regs[1]; // EBX
    *(int*)&outVendor[4] = regs[3]; // EDX
    *(int*)&outVendor[8] = regs[2]; // ECX
    outVendor[12] = '\0';
}
#else
SUMMIT_API uint64_t Summit_ReadRdtsc() { return AsmRdtsc(); }
SUMMIT_API void Summit_CpuidVendor(char outVendor[13]) {
    uint32_t regs[4];
    AsmCpuid(0, 0, regs);
    *(uint32_t*)&outVendor[0] = regs[1];
    *(uint32_t*)&outVendor[4] = regs[3];
    *(uint32_t*)&outVendor[8] = regs[2];
    outVendor[12] = '\0';
}
#endif
