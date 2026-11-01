#!/usr/bin/env python3
"""Make the small preview copy of a clip: 480 px tall, a keyframe every 0.2 s so seeking and loops are smooth.
Usage: python3 proxy.py <in.mp4> <out.mp4>"""
import subprocess, sys


def make_proxy(src, dst):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-vf", "scale=-2:480", "-r", "30", "-g", "6", "-keyint_min", "6",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", str(dst)],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    make_proxy(sys.argv[1], sys.argv[2])
