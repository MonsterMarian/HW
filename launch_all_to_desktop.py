import ctypes
from ctypes import wintypes
import os

class STARTUPINFO(ctypes.Structure):
    _fields_ = [
        ('cb', wintypes.DWORD),
        ('lpReserved', wintypes.LPWSTR),
        ('lpDesktop', wintypes.LPWSTR),
        ('lpTitle', wintypes.LPWSTR),
        ('dwX', wintypes.DWORD),
        ('dwY', wintypes.DWORD),
        ('dwXSize', wintypes.DWORD),
        ('dwYSize', wintypes.DWORD),
        ('dwXCountChars', wintypes.DWORD),
        ('dwYCountChars', wintypes.DWORD),
        ('dwFillAttribute', wintypes.DWORD),
        ('dwFlags', wintypes.DWORD),
        ('wShowWindow', wintypes.WORD),
        ('cbReserved2', wintypes.WORD),
        ('lpReserved2', ctypes.POINTER(wintypes.BYTE)),
        ('hStdInput', wintypes.HANDLE),
        ('hStdOutput', wintypes.HANDLE),
        ('hStdError', wintypes.HANDLE)
    ]

class PROCESS_INFORMATION(ctypes.Structure):
    _fields_ = [
        ('hProcess', wintypes.HANDLE),
        ('hThread', wintypes.HANDLE),
        ('dwProcessId', wintypes.DWORD),
        ('dwThreadId', wintypes.DWORD)
    ]

def launch(name, cmd, cwd=None, desktop=r"WinSta0\Default"):
    si = STARTUPINFO()
    si.cb = ctypes.sizeof(STARTUPINFO)
    si.lpDesktop = desktop
    pi = PROCESS_INFORMATION()
    
    # 0x00000010 = CREATE_NEW_CONSOLE, 0x00000008 = DETACHED_PROCESS
    flags = 0x00000010
    success = ctypes.windll.kernel32.CreateProcessW(
        None,
        cmd,
        None,
        None,
        False,
        flags,
        None,
        cwd,
        ctypes.byref(si),
        ctypes.byref(pi)
    )
    if not success:
        err = ctypes.GetLastError()
        print(f"[{name}] Failed with error: {err}")
        return False
    print(f"[{name}] Launched successfully! PID: {pi.dwProcessId}")
    ctypes.windll.kernel32.CloseHandle(pi.hProcess)
    ctypes.windll.kernel32.CloseHandle(pi.hThread)
    return True

if __name__ == '__main__':
    base = r"C:\Users\mvyst\Desktop\REPOS\HW"
    java = r"C:\Program Files\Eclipse Adoptium\jre-21.0.13.9-hotspot\bin\javaw.exe"

    # 1. Digital
    digital_dir = os.path.join(base, "Digital_App", "Digital")
    digital_jar = os.path.join(digital_dir, "Digital.jar")
    launch("1. Digital", f'"{java}" -jar "{digital_jar}"', cwd=digital_dir)

    # 2. Logisim Evolution
    logisim_dir = os.path.join(base, "Logisim_App", "app")
    logisim_jar = os.path.join(logisim_dir, "logisim-evolution-5.0.0-all.jar")
    launch("2. Logisim Evolution", f'"{java}" -jar "{logisim_jar}"', cwd=logisim_dir)

    # 3. Digital Logic Sim (SebLague)
    dls_dir = os.path.join(base, "DigitalLogicSim_App", "DLS_v0.39.1_x86_64_Windows", "Digital Logic Sim")
    dls_exe = os.path.join(dls_dir, "Digital Logic Sim.exe")
    launch("3. Digital Logic Sim", f'"{dls_exe}"', cwd=dls_dir)

    # 4. Web Simulator
    web_file = os.path.join(base, "digital-logic-circuit-simulator", "index.html")
    launch("4. Web Simulator", f'cmd.exe /c start "" "{web_file}"', cwd=base)
