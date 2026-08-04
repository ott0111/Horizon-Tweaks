cmake_minimum_required(VERSION 3.20)
project(SummitCore VERSION 1.0.0 LANGUAGES CXX ASM_MASM)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if(MSVC)
    add_compile_options(/W4 /WX- /O2 /MT)
else()
    add_compile_options(-Wall -Wextra -O3)
endif()

include_directories(${CMAKE_SOURCE_DIR}/include)

set(SOURCES
    src/dllmain.cpp
    src/SystemOptimizer.cpp
    src/Timing.cpp
    src/ProcessManager.cpp
    src/MemoryManager.cpp
    src/RegistryTweaks.cpp
)

if(MSVC AND CMAKE_SIZEOF_VOID_P EQUAL 8)
    list(APPEND SOURCES src/Timing.asm)
endif()

add_library(SummitCore SHARED ${SOURCES})
set_target_properties(SummitCore PROPERTIES PREFIX "")
target_link_libraries(SummitCore PRIVATE advapi32 psapi iphlpapi pdh)

if(MSVC)
    target_sources(SummitCore PRIVATE SummitCore.def)
endif()
