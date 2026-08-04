; Timing.asm - x86-64 MASM
.code

AsmRdtsc PROC
    rdtsc
    shl rdx, 32
    or rax, rdx
    ret
AsmRdtsc ENDP

AsmRdtscp PROC
    rdtscp
    shl rdx, 32
    or rax, rdx
    mov DWORD PTR [rcx], ecx ; aux
    ret
AsmRdtscp ENDP

AsmCpuid PROC
    push rbx
    ; C signature: AsmCpuid(uint32_t eax, uint32_t ecx, uint32_t regs[4])
    ; Windows x64: RCX=eax, RDX=ecx, R8=regs
    mov r9, rdx ; save ecx input
    mov r10, r8 ; save regs pointer
    mov eax, ecx
    mov ecx, r9d
    cpuid
    mov DWORD PTR [r10+0], eax
    mov DWORD PTR [r10+4], ebx
    mov DWORD PTR [r10+8], ecx
    mov DWORD PTR [r10+12], edx
    pop rbx
    ret
AsmCpuid ENDP

AsmTscFreqEstimateMs PROC
    ; Simplified: returns 0 placeholder; real impl would calibrate with QPC
    xor rax, rax
    ret
AsmTscFreqEstimateMs ENDP

END
