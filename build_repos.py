import os
import subprocess
import sys

base = r"C:\Users\mvyst\Desktop\REPOS\HW"

# find extracted jdk dir
jdk_parent = os.path.join(base, "jdk")
jdk_dirs = [d for d in os.listdir(jdk_parent) if os.path.isdir(os.path.join(jdk_parent, d))] if os.path.exists(jdk_parent) else []
if not jdk_dirs:
    print("JDK directory not found yet!")
    sys.exit(1)

java_home = os.path.join(jdk_parent, jdk_dirs[0])
print(f"Using JAVA_HOME: {java_home}")

mvn_bin = os.path.join(base, "maven", "apache-maven-3.9.9", "bin")

env = os.environ.copy()
env["JAVA_HOME"] = java_home
env["PATH"] = os.path.join(java_home, "bin") + os.pathsep + mvn_bin + os.pathsep + env.get("PATH", "")

print("=== 1. Building hneemann/Digital with Maven ===")
digital_dir = os.path.join(base, "Digital")
mvn_cmd = os.path.join(mvn_bin, "mvn.cmd")
res = subprocess.run([mvn_cmd, "clean", "package", "-DskipTests"], cwd=digital_dir, env=env)
if res.returncode == 0:
    print("SUCCESS: Digital built successfully!")
else:
    print(f"FAILED: Digital build returned {res.returncode}")

print("\n=== 2. Building logisim-evolution with Gradle ===")
logisim_dir = os.path.join(base, "logisim-evolution")
gradlew_cmd = os.path.join(logisim_dir, "gradlew.bat")
res2 = subprocess.run([gradlew_cmd, "shadowJar", "-x", "test"], cwd=logisim_dir, env=env)
if res2.returncode == 0:
    print("SUCCESS: Logisim-evolution built successfully!")
else:
    print(f"FAILED: Logisim-evolution build returned {res2.returncode}")

print("\n=== Summary of built targets ===")
for root, dirs, files in os.walk(os.path.join(digital_dir, "target")):
    for f in files:
        if f.endswith(".jar"):
            print("Digital artifact:", os.path.join(root, f))

for root, dirs, files in os.walk(os.path.join(logisim_dir, "build", "libs")):
    for f in files:
        if f.endswith(".jar"):
            print("Logisim artifact:", os.path.join(root, f))
