param([string]$Jdk='D:\AI-tools\android-offline\jdk-17.0.16+8', [string]$Sdk='D:\AI-tools\android-offline\sdk', [string]$Node='D:\English_download_and_software\node.exe', [string]$KeyStore='D:\AI-tools\android-offline\grassland-development.p12', [switch]$Release)
$ErrorActionPreference='Stop'
$env:JAVA_HOME=$Jdk
$env:ANDROID_USER_HOME='D:\Caches\android\user'
$env:TEMP='D:\Temp\DevTools'
$env:TMP=$env:TEMP
$root=$PSScriptRoot
$bt="$Sdk\build-tools\35.0.0"
$jar="$Sdk\platforms\android-35\android.jar"
foreach ($required in @("$Jdk\bin\javac.exe","$bt\aapt.exe",$jar)) {if (!(Test-Path -LiteralPath $required)) {throw "Missing tool: $required"}}
function Check([string]$step){if($LASTEXITCODE -ne 0){throw "$step failed ($LASTEXITCODE)"}}
& $Node "$root\prepare-web.cjs"
Check 'Offline web preparation'
New-Item -ItemType Directory -Force -Path "$root\build\classes","$root\build\dex","$root\dist","$root\res" | Out-Null
$manifest="$root\AndroidManifest.xml"
$output="$root\dist\grassland-cocos.apk"
if ($Release) {
  New-Item -ItemType Directory -Force -Path "$root\build\release" | Out-Null
  $manifest="$root\build\release\AndroidManifest.xml"
  (Get-Content -LiteralPath "$root\AndroidManifest.xml" -Raw).Replace('android:debuggable="true"','android:debuggable="false"') | Set-Content -LiteralPath $manifest -Encoding utf8
  $manifestXml=[xml](Get-Content -LiteralPath $manifest -Raw)
  $releaseVersion=$manifestXml.manifest.GetAttribute('versionName','http://schemas.android.com/apk/res/android').Split('-')[0]
  $output="$root\dist\grassland-$releaseVersion.apk"
}
$sources=@(Get-ChildItem -LiteralPath "$root\src" -Filter '*.java' -Recurse | ForEach-Object FullName)
& "$Jdk\bin\javac.exe" -encoding UTF-8 -source 8 -target 8 -classpath $jar -d "$root\build\classes" $sources
Check 'Java compilation'
& "$Jdk\bin\jar.exe" cf "$root\build\classes.jar" -C "$root\build\classes" .
Check 'Class packaging'
& "$bt\d8.bat" --lib $jar --min-api 26 --output "$root\build\dex" "$root\build\classes.jar"
Check 'DEX compilation'
& "$bt\aapt.exe" package -f -M $manifest -I $jar -S "$root\res" -A "$root\assets" -F "$root\build\unsigned.apk"
Check 'APK resources'
Push-Location "$root\build\dex"
try {& "$bt\aapt.exe" add "$root\build\unsigned.apk" 'classes.dex'; Check 'DEX packaging'} finally {Pop-Location}
& "$bt\zipalign.exe" -f -p 4 "$root\build\unsigned.apk" "$root\build\aligned.apk"
Check 'ZIP alignment'
$key=$KeyStore
New-Item -ItemType Directory -Force -Path (Split-Path -Parent ([System.IO.Path]::GetFullPath($key))) | Out-Null
if (!(Test-Path -LiteralPath $key)) {& "$Jdk\bin\keytool.exe" -genkeypair -keystore $key -storetype PKCS12 -storepass android -keypass android -alias grassland -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Grassland Development'; Check 'Development key'}
& "$bt\apksigner.bat" sign --ks $key --ks-pass pass:android --key-pass pass:android --ks-key-alias grassland --out $output "$root\build\aligned.apk"
Check 'Signing'
& "$bt\apksigner.bat" verify --verbose $output
Check 'Signature verification'
& "$bt\aapt.exe" dump permissions $output
Check 'Permission audit'
Get-FileHash -LiteralPath $output -Algorithm SHA256 | Format-List
