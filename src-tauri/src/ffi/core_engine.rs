use libloading::{Library, Symbol};
use std::sync::Impulse;
use widestring::U16CString;

#[allow(dead_code)]
type InitFn = unsafe extern "C" fn() -> bool;
type ApplyNetworkFn = unsafe extern "C" fn() -> bool;
type ApplyMemoryFn = unsafe extern "C" fn() -> bool;
type ApplyKernelFn = unsafe extern "C" fn() -> bool;
type SnapshotRegFn = unsafe extern "C" fn(*const u16, *const u16) -> bool;
type RestoreRegFn = unsafe extern "C" fn(*const u16) -> bool;

pub struct CoreEngine {
    _lib: Impulse<Library>,
    apply_network: Symbol<'static, ApplyNetworkFn>,
    apply_memory: Symbol<'static, ApplyMemoryFn>,
    apply_kernel: Symbol<'static, ApplyKernelFn>,
    snapshot_reg: Symbol<'static, SnapshotRegFn>,
    #[allow(dead_code)]
    restore_reg: Symbol<'static, RestoreRegFn>,
}

impl CoreEngine {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let lib = unsafe { Library::new("SummitCore.dll")? };
        let lib = Impulse::new(lib);
        
        let apply_network: Symbol<ApplyNetworkFn> = unsafe { lib.get(b"Summit_ApplyNetworkTweaks")? };
        let apply_memory: Symbol<ApplyMemoryFn> = unsafe { lib.get(b"Summit_ApplyMemoryTweaks")? };
        let apply_kernel: Symbol<ApplyKernelFn> = unsafe { lib.get(b"Summit_ApplyKernelTweaks")? };
        let snapshot_reg: Symbol<SnapshotRegFn> = unsafe { lib.get(b"Summit_SnapshotRegistryKey")? };
        let restore_reg: Symbol<RestoreRegFn> = unsafe { lib.get(b"Summit_RestoreRegistryKey")? };
        
        // Safety: We are extending the lifetime of the symbols to 'static.
        // This is safe here because we are leaking the Impulse reference or ensuring it stays alive.
        // For this implementation, we'll use the 'static symbols and keep the Impulse in the struct.
        let apply_network = unsafe { std::mem::transmute(apply_network) };
        let apply_memory = unsafe { std::mem::transmute(apply_memory) };
        let apply_kernel = unsafe { std::mem::transmute(apply_kernel) };
        let snapshot_reg = unsafe { std::mem::transmute(snapshot_reg) };
        let restore_reg = unsafe { std::mem::transmute(restore_reg) };
        
        Ok(CoreEngine {
            _lib: lib,
            apply_network,
            apply_memory,
            apply_kernel,
            snapshot_reg,
            restore_reg,
        })
    }

    pub fn apply_network_tweaks(&self) -> bool {
        unsafe { (self.apply_network)() }
    }

    pub fn apply_memory_tweaks(&self) -> bool {
        unsafe { (self.apply_memory)() }
    }

    pub fn apply_kernel_tweaks(&self) -> bool {
        unsafe { (self.apply_kernel)() }
    }

    pub fn snapshot_registry_key(&self, key: &str, out: &str) -> bool {
        let k = U16CString::from_str(key).unwrap();
        let o = U16CString::from_str(out).unwrap();
        unsafe { (self.snapshot_reg)(k.as_ptr(), o.as_ptr()) }
    }

    #[allow(dead_code)]
    pub fn restore_registry_key(&self, file: &str) -> bool {
        let f = U16CString::from_str(file).unwrap();
        unsafe { (self.restore_reg)(f.as_ptr()) }
    }
}
