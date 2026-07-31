#!/data/data/com.termux/files/usr/bin/bash
set -e
set -o pipefail

echo "== Vicious: Android build =="

export JAVA_HOME=/data/data/com.termux/files/usr/lib/jvm/java-17-openjdk

echo "-- Building Next.js production bundle --"
npm run build

if [ ! -d "android" ]; then
  echo "-- Adding Capacitor android platform --"
  npx cap add android
else
  echo "-- android/ already exists, syncing --"
fi

npx cap sync android

echo "-- Writing android/local.properties --"
echo "sdk.dir=/data/data/com.termux/files/home/android-sdk" > android/local.properties

echo "-- Forcing compileSdk/targetSdk to 34 (API 35 aapt2 incompatible with Termux) --"
if [ -f "android/variables.gradle" ]; then
  sed -i 's/compileSdkVersion = .*/compileSdkVersion = 34/' android/variables.gradle
  sed -i 's/targetSdkVersion = .*/targetSdkVersion = 34/' android/variables.gradle
fi

chmod +x android/gradlew

echo "-- Building debug APK --"
cd android
./gradlew assembleDebug --no-daemon --max-workers=1 2>&1 | tee build.log

echo ""
echo "== Done =="
echo "APK at: android/app/build/outputs/apk/debug/app-debug.apk"
echo "Install it via Samsung My Files. It's fully standalone now — no Termux server needed to run it."
