#pragma once
#include <cstdint>

// Assembly-backed timing
extern "C" uint64_t AsmRdtsc();
extern "C" uint64_t AsmRdtscp(uint32_t* aux);
extern "C" void AsmCpuid(uint32_t eax, uint32_t ecx, uint32_t regs[4]);
extern "C" uint64_t AsmTscFreqEstimateMs();
