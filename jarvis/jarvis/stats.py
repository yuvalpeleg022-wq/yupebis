"""Live system telemetry for the HUD panels."""
from __future__ import annotations

import os
import threading
import time

import psutil


def sampler(publish, stop: threading.Event, interval: float = 1.0):
    disk_path = os.environ.get("SystemDrive", "C:") + "\\" if os.name == "nt" else "/"
    net_prev = psutil.net_io_counters()
    t_prev = time.time()
    psutil.cpu_percent(percpu=True)
    while not stop.wait(interval):
        now = time.time()
        net = psutil.net_io_counters()
        dt = max(now - t_prev, 1e-3)
        cores = psutil.cpu_percent(percpu=True)
        vm = psutil.virtual_memory()
        sw = psutil.swap_memory()
        try:
            du = psutil.disk_usage(disk_path)
            disk = {"pct": du.percent, "free": du.free, "total": du.total}
        except Exception:
            disk = None
        bat = None
        try:
            b = psutil.sensors_battery()
            if b:
                bat = {"pct": b.percent, "plugged": b.power_plugged}
        except Exception:
            pass
        publish({
            "cpu": sum(cores) / max(len(cores), 1),
            "cores": cores,
            "ram": vm.percent, "ram_used": vm.used, "ram_total": vm.total,
            "swap": sw.percent,
            "disk": disk,
            "down": (net.bytes_recv - net_prev.bytes_recv) / dt,
            "up": (net.bytes_sent - net_prev.bytes_sent) / dt,
            "procs": len(psutil.pids()),
            "uptime": now - psutil.boot_time(),
            "battery": bat,
        })
        net_prev, t_prev = net, now
